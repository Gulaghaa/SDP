export const handleError = (error) => {

    if (error.response) {
        console.error("Server responded with:", error.response.data);
        console.error("Status code:", error.response.status);
        console.error("Headers:", error.response.headers);
    }

    else if (error.request) {
        console.error("No response received from the server");
        console.error("Request details:", error.request);
    }

    else {
        console.error("Error setting up the request:", error.message);
    }

    console.error("Request configuration:", error.config);
    return Promise.reject("Error during data fetch. Please try again later.");
};
