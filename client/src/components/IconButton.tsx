import { ButtonHTMLAttributes } from "react";
import { Button } from "react-bootstrap";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

class IconButton{
    static HomeButton(props: IconButtonProps) {
        return (
            <Button variant="light" className="p-2" aria-label="首頁" {...props}>
                <svg
                    width="32"
                    height="28"
                    viewBox="0 0 47 39"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M18.8 39V25.2353H28.2V39H39.95V20.6471H47L23.5 0L0 20.6471H7.05V39H18.8Z"
                        fill="#6B6969"
                    />
                </svg>
            </Button>
        );
    }

    static CloseButton(props: IconButtonProps) {
        return (
            <Button variant="light" className="p-2" aria-label="關閉" {...props}>
                <svg
                    width="24"
                    height="25"
                    viewBox="0 0 36 37"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M9.6 29.2918L7.5 27.1335L15.9 18.5002L7.5 9.86683L9.6 7.7085L18 16.3418L26.4 7.7085L28.5 9.86683L20.1 18.5002L28.5 27.1335L26.4 29.2918L18 20.6585L9.6 29.2918Z"
                        fill="#5F6368"
                    />
                </svg>
            </Button>
        );
    }

}

export default IconButton