import { useEffect, useState } from "react";

const ErrorModal = ({ message, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setVisible(true);
        }
    }, [message, onClose]);

    if (!visible) return null;

    return (
        <div style={modalStyles.overlay}>
            <div style={modalStyles.modal}>
                <div style={modalStyles.header}>
                    <span style={modalStyles.title}>Error</span>
                </div>
                <div style={modalStyles.body}>
                    <span style = {modalStyles.errortitle}>{message}</span>
                </div>
                <button onClick={onClose} style={modalStyles.actionButton}>OK</button>
            </div>
        </div>
    );
};

const modalStyles = {
    overlay: {
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "400px",
        zIndex: 1000,
        animation: "slideDown 0.4s ease-out",
    },
    modal: {
        backgroundColor: "#fdf1dc",
        border: "2.5px solid rgb(69,33,17)",
        borderRadius: "5px",
        boxShadow: "4px 4px 0px rgba(0, 0, 0, 0.3)",
        textAlign: "center",
        fontFamily: "Arial, sans-serif",
        animation: "fadeIn 0.3s ease-out",
        overflow: "hidden",
    },
    header: {
        backgroundColor: "rgb(246, 141, 125)",
        color: "#3e2723",
        padding: "12px 20px",
        fontSize: "18px",
        fontWeight: "bold",
        display: "flex",
        alignItems: "center",
        borderBottom: "2.5px solid rgb(69,33,17)",
    },
    title: {
        fontSize: "20px",
        fontFamily: "'Arial', sans-serif",  
        color: "#3e2723",  
        letterSpacing: "0.5px",
        textTransform: "uppercase",
    },  
    errortitle: {
        fontSize: "16px",
        fontFamily: "'Arial', sans-serif",  
        color: "#3e2723",  
        letterSpacing: "0.5px",
    },   
    body: {
        padding: "15px",
        fontSize: "14px",
        color: "#3e2723",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        justifyContent: "center",
    },
    icon: {
        fontSize: "28px",
        color: "#d87d66",
    },
    actionButton: {
        width: "70px",
        padding: "6px 10px",
        backgroundColor: "rgb(246, 141, 125)",
        color: "#3e2723",
        border: "2px solid rgb(69,33,17)",
        borderRadius: "2px",
        fontSize: "17px",
        cursor: "pointer",
        marginBottom: "20px",
        fontWeight: "bold",
    },
};

const styleSheet = document.styleSheets[0];
styleSheet.insertRule(
    `@keyframes slideDown {
    from { transform: translate(-50%, -50px); opacity: 0; }
    to { transform: translate(-50%, 5%); opacity: 1; }
  }`,
    styleSheet.cssRules.length
);
styleSheet.insertRule(
    `@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }`,
    styleSheet.cssRules.length
);

export default ErrorModal;
