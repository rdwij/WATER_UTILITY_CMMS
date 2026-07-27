import * as React from 'react';

// Stub shadcn-style Form components.
// The pages in this project use a react-hook-form API but the project
// uses Inertia's useForm. These stubs pass children/extra props through
// so the build succeeds; runtime form behavior is not implemented here.

type AnyProps = React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode };

export const Form = React.forwardRef<HTMLFormElement, AnyProps & { onSubmit?: (e: React.FormEvent) => void }>(
    ({ children, onSubmit, ...rest }, ref) => (
        <form ref={ref} onSubmit={onSubmit} {...rest}>
            {children}
        </form>
    ),
);
Form.displayName = 'Form';

export const FormItem = React.forwardRef<HTMLDivElement, AnyProps>(
    ({ children, ...rest }, ref) => (
        <div ref={ref} {...rest}>
            {children}
        </div>
    ),
);
FormItem.displayName = 'FormItem';

export const FormLabel = React.forwardRef<HTMLLabelElement, AnyProps>(
    ({ children, ...rest }, ref) => (
        <label ref={ref} {...rest}>
            {children}
        </label>
    ),
);
FormLabel.displayName = 'FormLabel';

export const FormControl = React.forwardRef<HTMLDivElement, AnyProps>(
    ({ children, ...rest }, ref) => (
        <div ref={ref} {...rest}>
            {children}
        </div>
    ),
);
FormControl.displayName = 'FormControl';

export const FormDescription = React.forwardRef<HTMLParagraphElement, AnyProps>(
    ({ children, ...rest }, ref) => (
        <p ref={ref} {...rest}>
            {children}
        </p>
    ),
);
FormDescription.displayName = 'FormDescription';

export const FormMessage = React.forwardRef<HTMLParagraphElement, AnyProps>(
    ({ children, ...rest }, ref) => (
        <p ref={ref} {...rest}>
            {children}
        </p>
    ),
);
FormMessage.displayName = 'FormMessage';

export type FormFieldRenderProps = {
    field: {
        name: string;
        value: unknown;
        onChange: (...args: unknown[]) => void;
        onBlur: () => void;
        // shadcn uses these names:
        onValueChange?: (value: unknown) => void;
        error?: unknown;
        // Allow any extra prop the page passes through
        [key: string]: unknown;
    };
};

type FormFieldProps = AnyProps & {
    control?: unknown;
    name?: string;
    value?: unknown;
    render?: (props: FormFieldRenderProps) => React.ReactNode;
};

export const FormField = ({ render, name, value, children, ...rest }: FormFieldProps) => {
    const field: FormFieldRenderProps['field'] = {
        name: name ?? '',
        value: value ?? '',
        onChange: () => {},
        onBlur: () => {},
        onValueChange: () => {},
    };
    if (render) return <>{render({ field })}</>;
    return <div {...rest}>{children}</div>;
};
