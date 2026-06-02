import React from 'react';
import './Header.css';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'FIFA WC Predict' }) => {
  return (
    <header className="header">
      <div className="header__brand">{title}</div>
    </header>
  );
};

export default Header;
