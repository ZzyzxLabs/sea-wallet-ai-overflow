export const oceanTheme = {
  colors: {
    primary: '#0077be',
    secondary: '#00a8e8',
    accent: '#00c9ff',
    background: {
      light: '#f0f9ff',
      card: 'rgba(255, 255, 255, 0.95)',
      glassMorphism: 'rgba(255, 255, 255, 0.85)',
    },
    text: {
      primary: '#0e4167',
      secondary: '#4a6fa5',
      light: '#7294b5',
    },
    wave: {
      light: '#e6f7ff',
      medium: '#bae7ff',
      dark: '#69c0ff',
    },
  },
  
  gradients: {
    ocean: 'linear-gradient(135deg, #0077be 0%, #00a8e8 50%, #00c9ff 100%)',
    oceanLight: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 50%, #91d5ff 100%)',
    oceanDeep: 'linear-gradient(180deg, #003459 0%, #007ea7 50%, #00a8e8 100%)',
    card: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(230,247,255,0.9) 100%)',
  },
  
  shadows: {
    soft: '0 4px 6px -1px rgba(0, 119, 190, 0.1), 0 2px 4px -1px rgba(0, 119, 190, 0.06)',
    medium: '0 10px 15px -3px rgba(0, 119, 190, 0.15), 0 4px 6px -2px rgba(0, 119, 190, 0.1)',
    wave: '0 10px 25px -3px rgba(0, 168, 232, 0.2), 0 6px 10px -2px rgba(0, 201, 255, 0.1)',
  },
  
  animations: {
    wave: 'wave 3s ease-in-out infinite',
    float: 'float 6s ease-in-out infinite',
    ripple: 'ripple 1.5s linear infinite',
  },
};

export const globalStyles = `
  @keyframes wave {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }
  
  @keyframes ripple {
    0% { transform: scale(0.95); opacity: 1; }
    100% { transform: scale(1.2); opacity: 0; }
  }
  
  .ocean-gradient {
    background: ${oceanTheme.gradients.ocean};
  }
  
  .ocean-card {
    background: ${oceanTheme.colors.background.glassMorphism};
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 119, 190, 0.1);
    border-radius: 16px;
    box-shadow: ${oceanTheme.shadows.wave};
    transition: all 0.3s ease;
  }
  
  .ocean-card:hover {
    box-shadow: ${oceanTheme.shadows.medium};
    transform: translateY(-2px);
  }
  
  .ocean-button {
    background: ${oceanTheme.gradients.ocean};
    color: white;
    border: none;
    border-radius: 12px;
    padding: 10px 20px;
    font-weight: 600;
    box-shadow: ${oceanTheme.shadows.soft};
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .ocean-button:before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }
  
  .ocean-button:hover {
    transform: translateY(-2px);
    box-shadow: ${oceanTheme.shadows.medium};
  }
  
  .ocean-button:hover:before {
    width: 300px;
    height: 300px;
  }
  
  .ocean-input {
    background: rgba(255, 255, 255, 0.9);
    border: 2px solid ${oceanTheme.colors.wave.medium};
    border-radius: 12px;
    padding: 12px 16px;
    transition: all 0.3s ease;
    color: ${oceanTheme.colors.text.primary};
  }
  
  .ocean-input:focus {
    outline: none;
    border-color: ${oceanTheme.colors.secondary};
    box-shadow: 0 0 0 3px rgba(0, 168, 232, 0.2);
  }
  
  .ocean-header {
    background: ${oceanTheme.gradients.oceanDeep};
    color: white;
    padding: 20px;
    border-radius: 16px 16px 0 0;
    position: relative;
    overflow: hidden;
  }
  
  .ocean-header:before {
    content: '';
    position: absolute;
    bottom: -50%;
    left: -50%;
    width: 200%;
    height: 100%;
    background: url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10C25 10 25 0 50 0C75 0 75 10 100 10C125 10 125 0 150 0' stroke='rgba(255,255,255,0.1)' stroke-width='2'/%3E%3C/svg%3E") repeat-x;
    animation: ${oceanTheme.animations.wave};
  }
  
  .wave-decoration {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 60px;
    background: url("data:image/svg+xml,%3Csvg width='100%25' height='60' viewBox='0 0 1200 60' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30C200 60 400 0 600 30C800 60 1000 0 1200 30V60H0V30Z' fill='%23e6f7ff'/%3E%3C/svg%3E");
    background-size: cover;
  }
`;

// Function to inject global styles
export function injectGlobalStyles() {
  if (typeof document !== 'undefined' && !document.querySelector('#ocean-theme-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'ocean-theme-styles';
    styleSheet.textContent = globalStyles;
    document.head.appendChild(styleSheet);
  }
}
