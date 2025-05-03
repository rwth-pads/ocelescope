import React, { useState, useContext, useCallback } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { ButtonVariant } from "react-bootstrap/types";

export type ConfirmationOptions = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: ButtonVariant;
};

const ConfirmationContext = React.createContext<
  (msg: string, options?: ConfirmationOptions) => Promise<boolean>
>((msg: string) => {
  throw new Error(
    "useConfirmation must be used within a ConfirmationModalProvider",
  );
});

export const useConfirmation = () => useContext(ConfirmationContext);

const ConfirmationModalProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [show, setShow] = useState(false);
  const [resolveReject, setResolveReject] = useState<
    [(value: boolean) => void, (reason: any) => void] | [undefined, undefined]
  >([undefined, undefined]);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("Confirm");
  const [cancelText, setCancelText] = useState("Cancel");
  const [confirmButtonVariant, setConfirmButtonVariant] = useState("primary");

  const confirm = useCallback((msg: string, options?: ConfirmationOptions) => {
    setMessage(msg);
    if (options?.title) setTitle(options.title);
    if (options?.confirmText) setConfirmText(options.confirmText);
    if (options?.cancelText) setCancelText(options.cancelText);
    if (options?.confirmButtonVariant)
      setConfirmButtonVariant(options.confirmButtonVariant);
    setShow(true);
    return new Promise<boolean>((resolve, reject) => {
      setResolveReject([resolve, reject]);
    });
  }, []);

  const handleConfirm = () => {
    setShow(false);
    (resolveReject[0] ?? ((x) => {}))(true);
  };

  const handleCancel = () => {
    setShow(false);
    (resolveReject[0] ?? ((x) => {}))(false);
  };

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <Modal show={show} onHide={handleCancel}>
        {!!title && <Modal.Header>{title}</Modal.Header>}
        <Modal.Body>{message}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button variant={confirmButtonVariant} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </Modal.Footer>
      </Modal>
    </ConfirmationContext.Provider>
  );
};

export default ConfirmationModalProvider;
