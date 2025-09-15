import React from "react";

const Footer = () => (
    <footer style={{
        background: '#c9a26d',
        color: 'black',
        padding: '1.5rem 0',
        textAlign: 'center',
        fontSize: '1rem',
        marginTop: 'auto',
        // minHeight: "100vh",
        // display: "flex",
        // flexDirection: "column"
    }}>
        <div>
            &copy; {new Date().getFullYear()} WearCycle. All rights reserved.
        </div>
        <div style={{ marginTop: '7px', fontSize: '14px' }}>
            <a
                href="/privacy"
                style={{ color: 'b', textDecoration: 'underline', marginRight: '1rem' }}
            >
                Privacy Policy
            </a>
            <a
                href="/terms"
                style={{ color: 'black', textDecoration: 'underline' }}
            >
                Terms of Service
            </a>
        </div>
    </footer>
);

export default Footer;