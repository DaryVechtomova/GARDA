import React, { useState, useEffect } from 'react';

const Hero = () => {
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Лінійна інтерполяція для плавного змінення розмірів
    const interpolate = (value, x1, y1, x2, y2) => {
        return y1 + ((value - x1) * (y2 - y1)) / (x2 - x1);
    };

    // Розрахунок розмірів для кожного елемента
    const calculateStyles = (minWidth, maxWidth, minStyle, maxStyle) => {
        return {
            width: `${interpolate(windowWidth, 600, minStyle.width, 1530, maxStyle.width)}px`,
            height: `${interpolate(windowWidth, 600, minStyle.height, 1530, maxStyle.height)}px`,
            left: `${interpolate(windowWidth, 600, minStyle.left, 1530, maxStyle.left)}px`,
            top: `${interpolate(windowWidth, 600, minStyle.top, 1530, maxStyle.top)}px`,
        };
    };

    // Стилі для мобільної версії (600px)
    const mobileStyles = {
        woman: { width: 140, height: 198, left: 186, top: 133 },
        bgDesign: { width: 600, height: 426.55, left: 0, top: 97.45 },
        house: { width: 387, height: 258, left: 211, top: 82 },
    };

    // Стилі для десктопної версії (1530px)
    const desktopStyles = {
        woman: { width: 288, height: 407, left: 580, top: 130 },
        bgDesign: { width: 1415.52, height: 762.59, left: 107.2, top: 80 },
        house: { width: 795, height: 530, left: 684, top: 80 },
    };

    // Розрахунок поточних стилів
    const womanStyles = calculateStyles(600, 1530, mobileStyles.woman, desktopStyles.woman);
    const bgDesignStyles = calculateStyles(600, 1530, mobileStyles.bgDesign, desktopStyles.bgDesign);
    const houseStyles = calculateStyles(600, 1530, mobileStyles.house, desktopStyles.house);

    return (
        <section style={{ position: 'relative', width: '100%', height: '100vh' }}>
            {/* Background Design */}
            <div
                style={{
                    position: 'absolute',
                    ...bgDesignStyles,
                    background: 'url("/src/assets/design/bg-design.png")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            ></div>

            {/* Woman */}
            <div
                style={{
                    position: 'absolute',
                    ...womanStyles,
                    background: 'url("/src/assets/design/woman.png")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            ></div>

            {/* House */}
            <div
                style={{
                    position: 'absolute',
                    ...houseStyles,
                    background: 'url("/src/assets/design/house.png")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            ></div>
        </section>
    );
};

export default Hero;