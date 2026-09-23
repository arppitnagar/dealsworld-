import { useCallback, useRef, useState } from "react";

// Promise-based replacement for Alert.alert, paired with
// <ConfirmModal {...confirmModalProps} />.
//
// Usage (confirm/cancel):
//   const { confirm, confirmModalProps } = useConfirmModal();
//   const ok = await confirm({ title: "Leave this deal?", destructive: true });
//   if (!ok) return;
//
// Usage (single-button info/error/success notice):
//   await alert({ title: "Missing details", message: "Please fill all fields." });
//
//   return (<>...<ConfirmModal {...confirmModalProps} /></>);
export default function useConfirmModal() {
  const [request, setRequest] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setRequest(options);
    });
  }, []);

  const alert = useCallback(
    (options) => {
      const opts = typeof options === "string" ? { message: options } : options;
      return confirm({
        confirmText: "OK",
        ...opts,
        singleButton: true,
      });
    },
    [confirm],
  );

  const respond = useCallback((result) => {
    setRequest(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  const confirmModalProps = {
    visible: Boolean(request),
    title: request?.title,
    message: request?.message,
    confirmText: request?.confirmText,
    cancelText: request?.cancelText,
    destructive: request?.destructive,
    tone: request?.tone,
    singleButton: request?.singleButton,
    icon: request?.icon,
    onConfirm: () => respond(true),
    onCancel: () => respond(false),
  };

  return { confirm, alert, confirmModalProps };
}
