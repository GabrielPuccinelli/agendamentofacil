import type { ReactNode } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

type ConfirmButtonProps = {
  /** The trigger element (e.g. a button). Rendered via asChild. */
  children: ReactNode;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** Style the confirm action as destructive (red). Default true. */
  destructive?: boolean;
};

/**
 * Wraps a trigger element in a confirmation AlertDialog — a polished
 * replacement for window.confirm() for destructive actions.
 */
export function ConfirmButton({
  children,
  onConfirm,
  title = 'Tem certeza?',
  description = 'Esta ação não pode ser desfeita.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  destructive = true,
}: ConfirmButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(destructive && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmButton;
