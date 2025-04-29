import axios from "axios";
import { handleError } from "./handleErrors";

export const useFetchData = async (path) => {
  try {
    const response = await axios.get(path);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const usePostData = async (url, data) => {
  try {
    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    return Promise.reject(handleError(error));
  }
};

export const useDeleteData = async (url) => {
  try {
    await axios.delete(url);
  } catch (error) {
    return Promise.reject(handleError(error));
  }
};

export const useUpdateData = async (url, data) => {
  try {
    const response = await axios.put(url, data);
    return response.data;
  } catch (error) {
    return Promise.reject(handleError(error));
  }
};

export const usePutData = async (url, data) => {
  try {
    const response = await axios.put(url, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    return Promise.reject(handleError(error));
  }
};

export const checkBarcodeInDatabase = async (barcode) => {
  try {
    const res = await axios.get(
      `https://smart-inventory-management-k5rx.onrender.com/inventory/check-barcode/${barcode}`
    );
    return res.data;
  } catch (err) {
    console.error("Barcode check failed:", err);
    return { exists: false };
  }
};

export const checkRoomIdInDatabase = async (roomId) => {
  try {
    const res = await axios.get(
      `https://smart-inventory-management-k5rx.onrender.com/inventory/check-room-id/${roomId}`
    );
    return res.data.exists; 
  } catch (err) {
    console.error("Barcode check failed:", err);
    return { exists: false };
  }
};
