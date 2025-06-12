// store.js
import { create } from 'zustand';

const packageName = "0x1";
const useHeirStore = create((set, get) => ({
  // Connection state
  isConnecting: false,
  showWelcome: false,
  showNextCard: false,
  showDashboardIndicator: false,
  // Warning state
  showWarning: false,
  warningMessage: "",
  addressContent: true,
  // Heir data
  heirs: [{ id: Date.now(), name: "", address: "", ratio: "" }],
  // Vault
  VaultName: [],
  setHeirs: (newHeirs) => set({ heirs: newHeirs }),

  // Set connection state
  setIsConnecting: (value) => set({ isConnecting: value }),
  setShowWelcome: (value) => set({ showWelcome: value }),
  setShowNextCard: (value) => set({ showNextCard: value }),
  setShowDashboardIndicator: (value) => set({ showDashboardIndicator: value }),
  setVaultName: (value) => set({ VaultName: value }),
  // Reset all state to initial values
  resetState: () => set({
    isConnecting: false,
    showWelcome: false,
    showNextCard: false,
    showDashboardIndicator: false,
    showWarning: false,
    warningMessage: "",
    addressContent: true,
    heirs: [{ id: Date.now(), name: "", address: "", ratio: "" }]
  }),
  
  // Set warning state
  setShowWarning: (value) => set({ showWarning: value }),
  setWarningMessage: (message) => set({ warningMessage: message }),
  
  // Show warning
  showWarningMessage: (message) => {
    set({ 
      warningMessage: message,
      showWarning: true 
    });
  },
  
  // Close warning
  closeWarning: () => set({ showWarning: false }),
  
  // Heir management
  addHeir: () => {
    const heirs = get().heirs;
    set({ heirs: [...heirs, { id: Date.now(), name: "", address: "", ratio: "" }] });
  },
  
  removeHeir: (idToRemove) => {
    const heirs = get().heirs;
    if (heirs.length > 1) {
      set({ heirs: heirs.filter(heir => heir.id !== idToRemove) });
    }
  },
  
  updateHeir: (id, field, value) => {
    // If it's the ratio field, ensure no negative numbers
    if (field === "ratio") {
      // Remove all non-numeric characters (keep decimal point)
      const numericValue = value.replace(/[^\d.]/g, '');
      
      // Ensure value is positive (remove minus sign)
      const positiveValue = numericValue.replace(/-/g, '');
      
      // Use the processed value
      value = positiveValue;
    }
    
    const heirs = get().heirs;
    const updatedHeirs = heirs.map(heir => {
      if (heir.id === id) {
        return { ...heir, [field]: value };
      }
      return heir;
    });
    
    set({ heirs: updatedHeirs });
  },
  
  // Calculate total ratio
  getTotalRatio: () => {
    const heirs = get().heirs;
    return heirs.reduce((sum, heir) => sum + (parseFloat(heir.ratio) || 0), 0);
  },
  
  // Validate form
  validateForm: () => {
    const { heirs, showWarningMessage } = get();
    
    // Check if all fields are filled
    const isAnyFieldEmpty = heirs.some(heir => !heir.name || !heir.address || !heir.ratio);
    if (isAnyFieldEmpty) {
      showWarningMessage("Please fill in all heir name, address, and ratio fields.");
      return false;
    }

    // Check address format - support Sui address or email
    const isAnyAddressInvalid = heirs.some(heir => {
      // Check if it's a valid Sui address or email
      const isSuiAddress = heir.address.startsWith("0x") && !heir.address.includes("@");
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(heir.address);
      return !(isSuiAddress || isEmail);
    });
    
    if (isAnyAddressInvalid) {
      showWarningMessage("Please ensure all addresses are valid Sui addresses or email formats.");
      return false;
    }

    // Check if ratio is a valid positive number
    const isAnyRatioInvalid = heirs.some(heir => {
      const value = parseFloat(heir.ratio);
      return isNaN(value) || value <= 0;
    });
    
    if (isAnyRatioInvalid) {
      showWarningMessage("Please ensure all ratio fields are valid positive numbers.");
      return false;
    }

    // Calculate total ratio
    const totalRatio = get().getTotalRatio();
    
    // Check if total ratio equals 100%
    if (Math.abs(totalRatio - 100) > 0.01) { // Use small error margin for floating point precision
      showWarningMessage(`Total heir ratio must be 100%. Current total is ${totalRatio}%.`);
      return false;
    }

    return true;
  },
  
  // Handle validation
  handleVerify: () => {
    const { validateForm, closeWarning, setShowDashboardIndicator, setShowNextCard } = get();
    
    // Close any open warnings
    closeWarning();
    
    // Validate form
    if (validateForm()) {
      // Form validation passed, show dashboard indicator and prepare to redirect
      console.log("Validated heirs:", get().heirs.map(heir => ({
        name: heir.name,
        address: heir.address,
        ratio: heir.ratio + "%"
      })));
      
      // Hide current card, show indicator
      // setShowNextCard(false);
      // setShowDashboardIndicator(true);
      
      return true;
    }
    
    return false;
  }
}));

export default useHeirStore;