import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const WelcomeMessage = ({ user }) => {
    const [showWelcome, setShowWelcome] = useState(true);

    useEffect(() => {
        if (showWelcome && user) {
            const fullName = `${user.secondName} ${user.firstName} ${user.middleName}`;
            toast.success(`Ласкаво просимо, ${fullName}!`, {
                position: "top-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
            setShowWelcome(false);
        }
    }, [user, showWelcome]);

    return null;
};

export default WelcomeMessage;