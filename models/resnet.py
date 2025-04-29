import os
import torch
import torchvision.transforms as transforms
from torch.utils.data import Dataset, DataLoader
from torchvision.models import resnet50, ResNet50_Weights
from PIL import Image
import torch.nn as nn
import torch.optim as optim
import torchmetrics

# Dataset Class
class CustomDataset(Dataset):
    def __init__(self, root_dir, transform=None):
        self.root_dir = root_dir
        self.transform = transform
        self.image_paths = []
        self.class_to_idx = {}

        for idx, class_name in enumerate(os.listdir(root_dir)):
            class_path = os.path.join(root_dir, class_name)
            if os.path.isdir(class_path):
                self.class_to_idx[class_name] = idx
                for img_file in os.listdir(class_path):
                    if img_file.endswith((".png", ".jpg", ".jpeg")):
                        self.image_paths.append((os.path.join(class_path, img_file), class_name))

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path, label_name = self.image_paths[idx]
        image = Image.open(img_path).convert("RGB")

        if label_name not in self.class_to_idx:
            raise ValueError(f"Unknown class label: {label_name}")

        label = self.class_to_idx[label_name]

        if self.transform:
            image = self.transform(image)

        return image, label

# Transformations
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

# Load dataset
dataset_path = "data"
train_dataset = CustomDataset(dataset_path, transform=transform)
train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)

# Define Model
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = resnet50(weights=ResNet50_Weights.IMAGENET1K_V1)
model.fc = nn.Linear(model.fc.in_features, len(train_dataset.class_to_idx))
model.to(device)

# Loss & Optimizer
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)  # Lower learning rate

# Initialize metrics
accuracy_metric = torchmetrics.Accuracy(task="multiclass", num_classes=len(train_dataset.class_to_idx)).to(device)
precision_metric = torchmetrics.Precision(task="multiclass", num_classes=len(train_dataset.class_to_idx)).to(device)
recall_metric = torchmetrics.Recall(task="multiclass", num_classes=len(train_dataset.class_to_idx)).to(device)
f1_metric = torchmetrics.F1Score(task="multiclass", num_classes=len(train_dataset.class_to_idx)).to(device)

# Training Function
def train_one_epoch(model, optimizer, data_loader, device, epoch):
    model.train()
    running_loss = 0.0
    accuracy_metric.reset()
    precision_metric.reset()
    recall_metric.reset()
    f1_metric.reset()

    for images, labels in data_loader:
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item()

        # Compute metrics
        preds = torch.argmax(outputs, dim=1)
        accuracy_metric.update(preds, labels)
        precision_metric.update(preds, labels)
        recall_metric.update(preds, labels)
        f1_metric.update(preds, labels)

    # Print metrics
    epoch_loss = running_loss / len(data_loader)
    epoch_acc = accuracy_metric.compute().item()
    epoch_prec = precision_metric.compute().item()
    epoch_recall = recall_metric.compute().item()
    epoch_f1 = f1_metric.compute().item()

    print(f"Epoch [{epoch+1}]: Loss: {epoch_loss:.4f}, Acc: {epoch_acc:.4f}, Prec: {epoch_prec:.4f}, Recall: {epoch_recall:.4f}, F1: {epoch_f1:.4f}")

    return epoch_loss, epoch_acc, epoch_prec, epoch_recall, epoch_f1

# Main Training Loop
def main():
    num_epochs = 2
    all_losses, all_acc, all_prec, all_recall, all_f1 = [], [], [], [], []

    for epoch in range(num_epochs):
        loss, acc, prec, recall, f1 = train_one_epoch(model, optimizer, train_loader, device, epoch)
        all_losses.append(loss)
        all_acc.append(acc)
        all_prec.append(prec)
        all_recall.append(recall)
        all_f1.append(f1)

    # Final metrics summary
    print("\n=== Final Model Metrics ===")
    print(f"Final mAP (approximate based on accuracy): {max(all_acc) * 100:.2f}%")
    print(f"Final Precision: {max(all_prec) * 100:.2f}%")
    print(f"Final Recall: {max(all_recall) * 100:.2f}%")
    print(f"Final F1 Score: {max(all_f1) * 100:.2f}%")

if __name__ == "__main__":
    main()
