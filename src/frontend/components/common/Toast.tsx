import { useOceanStore } from "@/src/zustand";
import React, { useState } from "react";
import BsToast, { ToastProps as BsToastProps } from "react-bootstrap/Toast";

export function useToast() {
  const { toasts, setToasts } = useOceanStore.useState.toasts();
  const addToast = (tp: ToastProps) => {
    setToasts((tps) => [...tps, tp]);
  };
  return addToast;
}

export type ToastProps = BsToastProps & {
  title: string;
  msg: string;
};

const Toast: React.FC<ToastProps> = ({ title, msg, ...props }) => {
  const [show, setShow] = useState(true);

  return (
    <BsToast
      onClose={() => setShow(false)}
      show={show}
      delay={5000}
      autohide
      {...props}
    >
      <BsToast.Header>
        <strong className="me-auto">{title}</strong>
      </BsToast.Header>
      <BsToast.Body>{msg}</BsToast.Body>
    </BsToast>
  );
};

export default Toast;
