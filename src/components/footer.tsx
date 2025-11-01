import React from "react";

const Footer = () => (
  <footer style={{
    background: 'linear-gradient(135deg, #c9a26d 0%, #b8916a 100%)',
    color: '#1f2937',
    padding: '2rem 2rem 1rem',
    marginTop: 'auto',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  }}>
    <div style={{
      maxWidth: '1200px',
      maxHeight: '300px',
      margin: '0 auto'
    }}>
      {/* Main Content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        marginBottom: '1rem',
        alignItems: 'start'
      }}>
        {/* Company Info */}
        <div style={{ textAlign: 'left' }}>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            WearCycle
          </h3>
          <p style={{
            fontSize: '1rem',
            lineHeight: '1.6',
            color: '#000000',
            margin: '0'
          }}>
            Your sustainable fashion marketplace. Buy, sell, and cycle pre-loved clothing to reduce waste and promote sustainable fashion.
          </p>
        </div>

        {/* Contact Section */}
        <div style={{
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'left'
        }}>
          <h4 style={{
            fontSize: '1rem',
            fontWeight: '700',
            marginBottom: '0.75rem',
            color: '#000000'
          }}>
            Need Help?
          </h4>
          <p style={{
            fontSize: '0.9rem',
            color: '#000000',
            marginBottom: '1rem',
            lineHeight: '1.5'
          }}>
            Have questions or facing any issues? We're here to help!
          </p>
          <a
            href="mailto:wearcycle001@gmail.com?subject=Support Request - WearCycle&body=Hi WearCycle Team,%0D%0A%0D%0APlease describe your issue or question:%0D%0A%0D%0A%0D%0AThank you!"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#1f2937',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = '#374151';
              (e.target as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = '#1f2937';
              (e.target as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <span>📧</span>
            wearcycle001@gmail.com
          </a>
        </div>
      </div>

      {/* Bottom Section */}
      <div style={{
        borderTop: '1px solid rgba(0, 0, 0, 0.1)',
        paddingTop: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{
          fontSize: '0.9rem',
          color: '#000000'
        }}>
          &copy; {new Date().getFullYear()} WearCycle. All rights reserved.
        </div>
        
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'center'
        }}>
          <a
            href="/privacy"
            style={{
              color: '#374151',
              textDecoration: 'none',
              fontSize: '0.9rem',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#1f2937'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#374151'}
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            style={{
              color: '#374151',
              textDecoration: 'none',
              fontSize: '0.9rem',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#1f2937'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#374151'}
          >
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;