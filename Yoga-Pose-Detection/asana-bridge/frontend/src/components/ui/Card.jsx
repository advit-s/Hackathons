import { forwardRef } from 'react';

const Card = forwardRef(({ children, className = '', onClick, hover = false, ...props }, ref) => {
    return (
        <div
            ref={ref}
            onClick={onClick}
            className={`
                bg-white rounded-xl shadow-lg border border-gray-100
                ${hover ? 'hover:shadow-xl transition-shadow duration-200 cursor-pointer' : ''}
                ${className}
            `}
            {...props}
        >
            {children}
        </div>
    );
});

Card.displayName = 'Card';

export const CardHeader = ({ children, className = '' }) => {
    return (
        <div className={`px-6 py-4 border-b border-gray-100 ${className}`}>
            {children}
        </div>
    );
};

export const CardBody = ({ children, className = '' }) => {
    return (
        <div className={`px-6 py-4 ${className}`}>
            {children}
        </div>
    );
};

export const CardFooter = ({ children, className = '' }) => {
    return (
        <div className={`px-6 py-4 border-t border-gray-100 ${className}`}>
            {children}
        </div>
    );
};

export default Card;
