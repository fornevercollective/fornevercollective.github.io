import React, { useState } from 'react';
import './Layout.css';

const Layout = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <div className="layout">
            <div className={`left-column ${isMenuOpen ? 'open' : 'hidden'}`}>
                {/* Left column content */}
            </div>
            <div className="main-content">
                <div className="header">
                    <div className="hamburger" onClick={toggleMenu}>☰</div>
                    <h1 className="feed-title">.feed</h1>
                </div>
                {/* Main content */}
            </div>
        </div>
    );
};

export default Layout;