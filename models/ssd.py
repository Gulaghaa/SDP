import os
import torch
import torchvision.transforms as transforms
from torch.utils.data import Dataset, DataLoader
from PIL import Image
import torch.optim as optim
from torchvision.models.detection import ssd300_vgg16, SSD300_VGG16_Weights
from torchvision.models.detection.ssd import SSDClassificationHead
import xml.etree.ElementTree as ET
import torchmetrics
from collections import defaultdict

class CustomDetectionDataset(Dataset):
    def __init__(self, root_dir, transform=None):
        self.root_dir = root_dir
        self.transform = transform
        self.image_paths = []
        self.annotations = {}
        self.class_to_idx = {"background": 0}
        self.invalid_boxes_count = 0
        
        for img_file in os.listdir(root_dir):
            if img_file.lower().endswith((".png", ".jpg", ".jpeg")):
                img_path = os.path.join(root_dir, img_file)
                xml_file = os.path.splitext(img_file)[0] + ".xml"
                xml_path = os.path.join(root_dir, xml_file)
                
                if os.path.exists(xml_path):
                    tree = ET.parse(xml_path)
                    root = tree.getroot()
                    
                    size = root.find("size")
                    img_width = int(size.find("width").text)
                    img_height = int(size.find("height").text)
                    
                    boxes = []
                    labels = []
                    invalid_boxes_in_image = 0
                    
                    for obj in root.findall("object"):
                        class_name = obj.find("name").text
                        if class_name not in self.class_to_idx:
                            self.class_to_idx[class_name] = len(self.class_to_idx)
                        
                        bbox = obj.find("bndbox")
                        xmin = float(bbox.find("xmin").text) / img_width
                        ymin = float(bbox.find("ymin").text) / img_height
                        xmax = float(bbox.find("xmax").text) / img_width
                        ymax = float(bbox.find("ymax").text) / img_height
                        
                        if xmin >= xmax or ymin >= ymax:
                            invalid_boxes_in_image += 1
                            continue
                            
                        boxes.append([xmin, ymin, xmax, ymax])
                        labels.append(self.class_to_idx[class_name])
                    
                    if boxes:
                        self.image_paths.append(img_path)
                        self.annotations[img_path] = {
                            "boxes": torch.tensor(boxes, dtype=torch.float32),
                            "labels": torch.tensor(labels, dtype=torch.int64)
                        }
                        if invalid_boxes_in_image > 0:
                            self.invalid_boxes_count += invalid_boxes_in_image
        
        print(f"\nDataset Summary:")
        print(f"Found {len(self.image_paths)} images with valid annotations")
        print(f"Classes: {self.class_to_idx}")
        print(f"Skipped {self.invalid_boxes_count} invalid bounding boxes")

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        image = Image.open(img_path).convert("RGB")
        target = self.annotations[img_path]
        
        if self.transform:
            image = self.transform(image)
        
        return image, target

def collate_fn(batch):
    return tuple(zip(*batch))

def train_one_epoch(model, optimizer, data_loader, device, epoch, metrics):
    model.train()
    running_loss = 0.0
    
    # Initialize metrics for this epoch
    for metric in metrics.values():
        metric.reset()
    
    for batch_idx, (images, targets) in enumerate(data_loader):
        # Filter out empty targets
        valid_indices = [i for i, t in enumerate(targets) if len(t["boxes"]) > 0]
        if not valid_indices:
            continue
            
        images = [images[i].to(device) for i in valid_indices]
        targets = [targets[i] for i in valid_indices]
        targets = [{k: v.to(device) for k, v in t.items()} for t in targets]
        
        optimizer.zero_grad()
        loss_dict = model(images, targets)
        losses = sum(loss for loss in loss_dict.values())
        losses.backward()
        optimizer.step()
        
        running_loss += losses.item()
        
        # Calculate metrics
        with torch.no_grad():
            model.eval()
            predictions = model(images)
            model.train()
            
            for pred, target in zip(predictions, targets):
                # Filter predictions with confidence > 0.5
                mask = pred['scores'] > 0.5
                pred_labels = pred['labels'][mask]
                pred_scores = pred['scores'][mask]
                
                if len(pred_labels) > 0 and len(target['labels']) > 0:
                    # For each target, find best matching prediction
                    for true_label in target['labels']:
                        # Find predictions of this class
                        class_mask = pred_labels == true_label
                        if class_mask.any():
                            # Consider this as a true positive
                            pred_tensor = torch.tensor([true_label], device=device)
                            true_tensor = torch.tensor([true_label], device=device)
                        else:
                            # Consider this as a false negative
                            pred_tensor = torch.tensor([0], device=device)  # background
                            true_tensor = torch.tensor([true_label], device=device)
                        
                        # Update all metrics
                        for metric in metrics.values():
                            metric.update(pred_tensor, true_tensor)
        
        print(f"Epoch [{epoch+1}] Batch [{batch_idx+1}/{len(data_loader)}] Loss: {losses.item():.4f}", end='\r')
    
    # Calculate epoch metrics
    epoch_loss = running_loss / len(data_loader)
    epoch_metrics = {
        'loss': epoch_loss,
        'accuracy': metrics['accuracy'].compute().item(),
        'precision': metrics['precision'].compute().item(),
        'recall': metrics['recall'].compute().item(),
        'f1': metrics['f1'].compute().item()
    }
    
    print(f"Epoch [{epoch+1}]: "
          f"Loss: {epoch_metrics['loss']:.4f}, "
          f"Acc: {epoch_metrics['accuracy']:.4f}, "
          f"Prec: {epoch_metrics['precision']:.4f}, "
          f"Recall: {epoch_metrics['recall']:.4f}, "
          f"F1: {epoch_metrics['f1']:.4f}")
    
    return epoch_metrics

def main():
    # Initialize dataset
    transform = transforms.Compose([
        transforms.Resize((300, 300)),
        transforms.ToTensor(),
    ])

    dataset_path = "data/train"
    train_dataset = CustomDetectionDataset(dataset_path, transform=transform)

    if len(train_dataset) == 0:
        raise ValueError("No valid training samples found!")

    # Initialize DataLoader
    train_loader = DataLoader(
        train_dataset,
        batch_size=4,
        shuffle=True,
        collate_fn=collate_fn,
        num_workers=0
    )

    # Initialize model
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\nUsing device: {device}")

    weights = SSD300_VGG16_Weights.DEFAULT
    model = ssd300_vgg16(weights=weights)

    # Adjust model for custom classes
    num_classes = len(train_dataset.class_to_idx)
    model.head.classification_head = SSDClassificationHead(
        in_channels=[512, 1024, 512, 256, 256, 256],
        num_anchors=[4, 6, 6, 6, 4, 4],
        num_classes=num_classes,
    )
    model.to(device)

    # Training setup
    optimizer = optim.Adam(model.parameters(), lr=0.0001)

    # Initialize metrics
    metrics = {
        'accuracy': torchmetrics.Accuracy(task="multiclass", num_classes=num_classes).to(device),
        'precision': torchmetrics.Precision(task="multiclass", num_classes=num_classes).to(device),
        'recall': torchmetrics.Recall(task="multiclass", num_classes=num_classes).to(device),
        'f1': torchmetrics.F1Score(task="multiclass", num_classes=num_classes).to(device)
    }

    # Training loop
    num_epochs = 1
    history = defaultdict(list)
    
    for epoch in range(num_epochs):
        epoch_metrics = train_one_epoch(model, optimizer, train_loader, device, epoch, metrics)
        
        # Store metrics for final report
        for k, v in epoch_metrics.items():
            history[k].append(v)

    # Final metrics summary
    print("\n=== Final Model Metrics ===")
    print(f"Best Loss: {min(history['loss']):.4f}")
    print(f"Best Accuracy: {max(history['accuracy']) * 100:.2f}%")
    print(f"Best Precision: {max(history['precision']) * 100:.2f}%")
    print(f"Best Recall: {max(history['recall']) * 100:.2f}%")
    print(f"Best F1 Score: {max(history['f1']) * 100:.2f}%")

if __name__ == '__main__':
    main()