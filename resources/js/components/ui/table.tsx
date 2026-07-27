import * as React from 'react';

type AnyProps = React.HTMLAttributes<HTMLElement> & {
    children?: React.ReactNode;
};

const passthrough = <T extends keyof JSX.IntrinsicElements>(
    tag: T,
): React.ForwardRefExoticComponent<
    React.PropsWithoutRef<JSX.IntrinsicElements[T] & AnyProps> & React.RefAttributes<unknown>
> => {
    const Component = React.forwardRef<unknown, JSX.IntrinsicElements[T] & AnyProps>(
        ({ children, ...rest }, ref) =>
            React.createElement(tag, { ref, ...rest }, children),
    );
    Component.displayName = tag;
    return Component as never;
};

// Table stubs
export const Table = passthrough('table');
export const TableHeader = passthrough('thead');
export const TableBody = passthrough('tbody');
export const TableFooter = passthrough('tfoot');
export const TableRow = passthrough('tr');
export const TableHead = passthrough('th');
export const TableCell = passthrough('td');
export const TableCaption = passthrough('caption');

// Aliases used in some pages
export const Thead = TableHeader;
export const Tbody = TableBody;
export const Tr = TableRow;
export const Th = TableHead;
export const Td = TableCell;

// Pagination stub
type PaginationProps = AnyProps;
export const Pagination = ({ children, ...rest }: PaginationProps) => (
    <nav {...rest}>{children}</nav>
);
