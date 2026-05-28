type IconProps = {
  size?: number;
  className?: string;
};

export function IconPlay({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
    </svg>
  );
}

export function IconPause({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 5h4v14H6V5Zm8 0h4v14h-4V5Z" fill="currentColor" />
    </svg>
  );
}

export function IconClose({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3 1.42 1.42Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconChevronLeft({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M15.5 19 8.5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTrash({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14.8333 16.5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5.75 7.41667V12.4167M9.08333 7.41667V12.4167M0.75 4.08333H14.0833M13.25 4.08333L12.5275 14.2017C12.4976 14.6222 12.3094 15.0157 12.0009 15.303C11.6924 15.5903 11.2866 15.75 10.865 15.75H3.96833C3.54678 15.75 3.14089 15.5903 2.8324 15.303C2.52392 15.0157 2.33576 14.6222 2.30583 14.2017L1.58333 4.08333H13.25ZM9.91667 4.08333V1.58333C9.91667 1.36232 9.82887 1.15036 9.67259 0.994078C9.51631 0.837797 9.30435 0.75 9.08333 0.75H5.75C5.52899 0.75 5.31702 0.837797 5.16074 0.994078C5.00446 1.15036 4.91667 1.36232 4.91667 1.58333V4.08333H9.91667Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

