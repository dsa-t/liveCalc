const DEFAULT_PRECISION = 18;
const EXAMPLE_DATA = 'IYAgvCCMBMDMAsAoUBLAdiAFgUwB7JHRACN1FEAGYyG2mkAd2ABdmBnc6AVgopAHUQAKihZCGANb9MiSHyky2AVwC25SCDVdNa5WsTQVwkNAlrIRgPQhtK/QEFwIABSQAdNBDXnsN7BAA1FBuAOwAlGEgAMZqAEJOXG4UABzRRkHQbtroUTIAwk7xIkUgjkQxsOQAZk7QFACyABIAXrKWNURoHIhAA==';

document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  initializeApp();
  initializeModal();
  initializeDarkMode();
  initializeKeyboardBehavior(); // Added keyboard behavior initialization

  updateMath();
}, false);

function initializeApp() {
  const precision = parseInt(localStorage.getItem('precision')) || DEFAULT_PRECISION;
  
  math.config({
    number: 'BigNumber',
    precision: precision,
    relTol: Math.pow(10, -(precision - 4)),
    absTol: Math.pow(10, -(precision - 1)),
  });

  extendMathJsWithBaseConversions();
  
  const hashvalue = window.location.hash.substring(1);
  if (hashvalue.length >= 4) {
    $('#frame1').val(decodeDataFromURL(hashvalue));
  } else {
    const lastInput = localStorage.getItem('liveCalcLastInput');
    if (lastInput) {
      $('#frame1').val(lastInput);
    } else {
      $('#frame1').val(decodeDataFromURL(EXAMPLE_DATA));
    }
  }
  updateMath();

  $('#frame1').on('input change', function() {
    updateMath();
    if (!$(this).data('typing')) {
      $(this).data('typing', true);
      setTimeout(() => {
        const encodedMath = encodeDataForURL($('#frame1').val());
        window.location.hash = encodedMath;
        localStorage.setItem('liveCalcLastInput', $('#frame1').val());
        $(this).data('typing', false);
      }, 1000);
    }
  });

  $('#frame1').on('scroll', function() {
    $('.bed-highlights').css('transform', `translate(${-this.scrollLeft}px, ${-this.scrollTop}px)`);
  });
}

// Add this function for better keyboard behavior
function initializeKeyboardBehavior() {
  const textarea = document.getElementById('frame1');
  
  // Only apply on mobile devices
  if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return;
  }
  
  // Create a hidden input that will be used to trigger the numeric keyboard
  const hiddenInput = document.createElement('input');
  hiddenInput.setAttribute('type', 'password');
  hiddenInput.style.position = 'absolute';
  hiddenInput.style.top = '0px';
  hiddenInput.style.left = '0px';
  hiddenInput.style.opacity = '0';
  hiddenInput.style.width = '1px';
  hiddenInput.style.height = '1px';
  hiddenInput.style.pointerEvents = 'none';
  hiddenInput.style.zIndex = '-999';
  hiddenInput.style.padding = '0';
  hiddenInput.style.margin = '0';
  hiddenInput.style.border = 'none';
  hiddenInput.style.outline = 'none';
  hiddenInput.style.resize = 'none';
  hiddenInput.style.background = 'transparent';
  hiddenInput.tabIndex = -1;
  
  // Add to the document body to prevent scroll issues
  document.body.appendChild(hiddenInput);
  
  // Add a custom CSS class for showing the caret
  const style = document.createElement('style');
  style.innerHTML = `
    .textarea-with-caret {
      caret-color: auto !important;
    }
    .textarea-with-caret:focus {
      caret-color: auto !important;
    }
  `;
  document.head.appendChild(style);
  
  // Reference to the active element that should have keyboard focus
  let activeElement = textarea;
  let isKeyboardActive = false;
  
  // Keyboard input handler
  function handleKeyboardInput(e) {
    // Skip events that aren't from the hidden input
    if (e.target !== hiddenInput) return;
    
    const inputValue = hiddenInput.value;
    hiddenInput.value = ''; // Clear for next input
    
    if (inputValue.length > 0) {
      // Get the last character typed
      const lastChar = inputValue[inputValue.length - 1];
      
      // Get current cursor position
      const cursorPos = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      
      // Insert the character
      const textBefore = textarea.value.substring(0, cursorPos);
      const textAfter = textarea.value.substring(selectionEnd);
      textarea.value = textBefore + lastChar + textAfter;
      
      // Move cursor position
      const newCursorPos = cursorPos + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      
      // Trigger events for calculator to update
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Ensure textarea visually has focus and shows caret
      textarea.classList.add('textarea-with-caret');
      
      // Re-focus on hidden input to maintain keyboard
      setTimeout(() => {
        hiddenInput.focus();
      }, 0);
    }
  }
  
  // Backspace and special key handler
  function handleSpecialKeys(e) {
    if (e.target !== hiddenInput) return;
    
    if (e.key === 'Backspace') {
      e.preventDefault();
      
      // Get current cursor position
      const cursorPos = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      
      if (cursorPos > 0 || cursorPos !== selectionEnd) {
        let newValue;
        let newPosition;
        
        // If text is selected, remove selection
        if (cursorPos !== selectionEnd) {
          newValue = textarea.value.substring(0, cursorPos) + textarea.value.substring(selectionEnd);
          newPosition = cursorPos;
        } else { 
          // Otherwise remove character before cursor
          newValue = textarea.value.substring(0, cursorPos - 1) + textarea.value.substring(cursorPos);
          newPosition = cursorPos - 1;
        }
        
        textarea.value = newValue;
        textarea.setSelectionRange(newPosition, newPosition);
        
        // Trigger events
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      // Add new line
      const cursorPos = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      const newValue = 
        textarea.value.substring(0, cursorPos) + 
        '\n' + 
        textarea.value.substring(selectionEnd);
      
      textarea.value = newValue;
      textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
      
      // Trigger events
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  
  // Handle text area click to switch to numeric keyboard
  textarea.addEventListener('click', function(e) {
    // Activate the hidden input to get the numeric keyboard
    hiddenInput.focus();
    isKeyboardActive = true;
    
    // Make the caret visible in the textarea
    textarea.classList.add('textarea-with-caret');
    
    // Prevent the default soft keyboard
    e.preventDefault();
  });
  
  // Handle textarea focus
  textarea.addEventListener('focus', function() {
    if (!isKeyboardActive) {
      // If not already active, switch to the hidden input
      hiddenInput.focus();
      isKeyboardActive = true;
    }
    
    // Make cursor visible
    textarea.classList.add('textarea-with-caret');
  });
  
  // Handle input on the hidden field
  hiddenInput.addEventListener('input', handleKeyboardInput);
  
  // Special key handling
  hiddenInput.addEventListener('keydown', handleSpecialKeys);
  
  // When hidden input loses focus, reset state
  hiddenInput.addEventListener('blur', function(e) {
    // Check if focus moved to our textarea
    if (e.relatedTarget !== textarea) {
      isKeyboardActive = false;
      textarea.classList.remove('textarea-with-caret');
    }
  });
}

function initializeModal() {
  const modal = document.getElementById("settingsModal");
  const closeBtn = modal.querySelector(".close");
  
  closeBtn.onclick = function() {
    saveSettings();
    modal.style.display = "none";
  }
  
  window.onclick = function(event) {
    if (event.target == modal) {
      saveSettings();
      modal.style.display = "none";
    }
  }
  
  $('#showErrors').on('change', function() {
    localStorage.setItem('showErrors', $(this).is(':checked'));
    updateMath();
  });
  
  $('#darkMode').on('change', function() {
    const isDarkMode = $(this).is(':checked');
    localStorage.setItem('darkMode', isDarkMode);
    applyDarkMode(isDarkMode);
  });
  
  $('#alignToMaxLength').on('change', function() {
    localStorage.setItem('alignToMaxLength', $(this).is(':checked'));
    updateMath();
  });
  
  $('#precision').on('change', function() {
    const precision = parseInt($(this).val()) || DEFAULT_PRECISION;
    localStorage.setItem('precision', precision);
    updatePrecisionConfig(precision);
    updateMath();
  });

  // Initialize precision control buttons
  $('#increase-precision').on('click', function() {
    const currentPrecision = parseInt($('#precision').val()) || DEFAULT_PRECISION;
    const newPrecision = Math.min(64, currentPrecision + 1); // Max value is 64
    $('#precision').val(newPrecision);
    localStorage.setItem('precision', newPrecision);
    updatePrecisionConfig(newPrecision);
    updateMath();
  });
  
  $('#decrease-precision').on('click', function() {
    const currentPrecision = parseInt($('#precision').val()) || DEFAULT_PRECISION;
    const newPrecision = Math.max(1, currentPrecision - 1); // Min value is 1
    $('#precision').val(newPrecision);
    localStorage.setItem('precision', newPrecision);
    updatePrecisionConfig(newPrecision);
    updateMath();
  });
}

function initializeDarkMode() {
  const darkMode = localStorage.getItem('darkMode') === 'true';
  applyDarkMode(darkMode);
  
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem('darkMode') === null) {
      const newDarkModeState = e.matches;
      $('#darkMode').prop('checked', newDarkModeState);
      applyDarkMode(newDarkModeState);
    }
  });
}

function applyDarkMode(isDarkMode) {
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

function openSettings() {
  const modal = document.getElementById("settingsModal");
  modal.style.display = "block";
}

function loadSettings() {
  const showErrorsState = localStorage.getItem('showErrors');
  const showErrors = showErrorsState !== null ? showErrorsState === 'true' : false;
  $('#showErrors').prop('checked', showErrors);
  
  const darkModeState = localStorage.getItem('darkMode');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const darkMode = darkModeState !== null ? darkModeState === 'true' : prefersDarkScheme;
  $('#darkMode').prop('checked', darkMode);
  
  // Simple alignment state check without backward compatibility
  const alignmentState = localStorage.getItem('alignToMaxLength');
  const alignToMaxLength = alignmentState !== null ? alignmentState === 'true' : false;
  $('#alignToMaxLength').prop('checked', alignToMaxLength);
  
  const precisionState = localStorage.getItem('precision');
  const precision = precisionState !== null ? parseInt(precisionState) : DEFAULT_PRECISION;
  $('#precision').val(precision || DEFAULT_PRECISION);
}

function saveSettings() {
  const showErrors = $('#showErrors').is(':checked');
  const darkMode = $('#darkMode').is(':checked');
  const alignToMaxLength = $('#alignToMaxLength').is(':checked');
  const precision = parseInt($('#precision').val()) || DEFAULT_PRECISION;
  
  localStorage.setItem('showErrors', showErrors);
  localStorage.setItem('darkMode', darkMode);
  localStorage.setItem('alignToMaxLength', alignToMaxLength);
  localStorage.setItem('precision', precision);
  
  updatePrecisionConfig(precision);
  updateMath();
}

function updatePrecisionConfig(precision) {
  math.config({
    number: 'BigNumber',
    precision: precision,
    relTol: Math.pow(10, -(precision - 4)),
    absTol: Math.pow(10, -(precision - 1)),
  });
}

function extendMathJsWithBaseConversions() {
  const baseConfigs = {
    hex: { base: 16, prefix: '0x' },
    bin: { base: 2, prefix: '0b' },
    oct: { base: 8, prefix: '0o' },
    dec: { base: 10, prefix: '' }
  };
  
  const conversions = {};
  
  Object.keys(baseConfigs).forEach(baseType => {
    conversions[`to_${baseType}`] = function(value) {
      if (math.typeOf(value) === 'Unit') {
        throw new Error('Must be unitless');
      }
      
      if (baseType !== 'dec' && (!Number.isInteger(Number(value)))) {
        throw new Error(`Can't convert fractional numbers to ${baseType}`);
      }
      
      if (baseType === 'dec') {
        return math.format(value, {notation: 'fixed'});
      } else {
        return math.format(value, {notation: baseType, fraction: 'decimal'}).toLowerCase();
      }
    };
  });
  
  Object.keys(baseConfigs).forEach(baseType => {
    if (baseType === 'dec') return;
    const config = baseConfigs[baseType];
    conversions[`from_${baseType}`] = function(value) {
      if (typeof value === 'string') {
        value = value.toLowerCase().replace(new RegExp(`^${config.prefix}`), '');
      }
      return parseInt(value, config.base);
    };
  });
  
  math.import(conversions);
  
  const originalParse = math.parse;
  math.parse = function(expr) {
    if (typeof expr === 'string') {
      Object.keys(baseConfigs).forEach(baseType => {
        if (baseType === 'dec') return;
        const config = baseConfigs[baseType];
        const regex = new RegExp(`${config.prefix}([0-9a-fA-F]+)`, 'g');
        expr = expr.replace(regex, `from_${baseType}("$1")`);
      });
      
      const conversionKeywords = ['in', 'to'];
      conversionKeywords.forEach(keyword => {
        Object.keys(baseConfigs).forEach(baseType => {
          const pattern = new RegExp(`(.+?)\\s+${keyword}\\s+${baseType}(?:\\b|$)`, 'gi');
          expr = expr.replace(pattern, (match, group) => {
            if (group.trim()) {
              return `to_${baseType}(${group})`;
            }
            return match;
          });
        });
      });
    }
    return originalParse.call(math, expr);
  };
}

function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str) {
  return decodeURIComponent(escape(window.atob(str)));
}

function compressData(str) {
  return LZString.compressToBase64(str);
}

function decompressData(str) {  
  try {
    // First try to decompress as LZString compressed content
    const decompressed = LZString.decompressFromBase64(str);
    // If result is not null and has length, it was successfully decompressed
    if (decompressed !== null) {
      return decompressed;
    }
  } catch (e) {
    // If decompression fails, continue to try b64 decoding
    console.log("LZ decompression failed, trying base64", e);
  }
  
  // Fall back to regular base64 decoding
  try {
    return b64_to_utf8(str);
  } catch (e) {
    console.error("Failed to decode base64 data:", e);
    return str;
  }
}

function encodeDataForURL(str) {
  return compressData(str);
}

function decodeDataFromURL(str) {
  return decompressData(str);
}

function evalInput(customFormatter = {}){
  const parser = math.parser();
  let output = '';
  let input = [];
  let formulas = $('#frame1').val();
  
  const showErrors = localStorage.getItem('showErrors') !== 'false';
  const alignToMaxLength = localStorage.getItem('alignToMaxLength') === 'true';
  
  // Calculate max length for alignment once
  const arrayOfLines = formulas.split('\n');
  const maxLen = Math.max(...arrayOfLines.map(item => item.length));
  
  // Default formatters with spacing calculation built-in
  const defaultFormatters = {
    calculateSpacing: (item) => {
      if (alignToMaxLength) {
        const spacesNeeded = Math.max(1, maxLen - item.length + 2);
        return ' '.repeat(spacesNeeded);
      } else {
        return '\t';
      }
    },
    lineResult: (item, result, alignToMaxLength, maxLen) => {
      const spacing = defaultFormatters.calculateSpacing(item);
      return `${item}${spacing}${result}\n`;
    },
    sumLine: (item, displaySum, alignToMaxLength, maxLen) => {
      const spacing = defaultFormatters.calculateSpacing(item);
      return `${item}${spacing}<span class="sum-value">${displaySum}</span>\n`;
    },
    errorLine: (item, errorMessage) => `${item} <span class="error-text">&lt;${errorMessage}&gt;</span>\n`,
    emptyLine: (item) => `${item}\n`
  };
  
  // Merge with provided formatters
  const formatters = { ...defaultFormatters, ...customFormatter };
  
  if (formulas.includes(",") && !formulas.includes(".")) {
    formulas = formulas.replace(/(\d+),(\d+)/gi, "$1.$2");
  }

  let globalSum = math.bignumber(0);
  let localSum = math.bignumber(0);
  let units = null;

  arrayOfLines.forEach(item => {
    if (containsSumKeyword(item)) {
      const displaySum = units ? new math.Unit(localSum, units).simplify() : localSum.toString();
      output += formatters.sumLine(item, displaySum, alignToMaxLength, maxLen);
      localSum = math.bignumber(0);
    } else {
      try {
        parser.evaluate(item);
      } catch (err) {
        if (showErrors) {
          output += formatters.errorLine(item, err.message);
        } else {
          output += formatters.emptyLine(item);
        }
        console.error(`Error evaluating item: "${item}": ${err.message}`);
        return;
      }

      input.push(item);
      const evaluationResult = evaluateItem(parser, input, item, alignToMaxLength, maxLen, formatters);
      output += evaluationResult;

      const lastResult = getLastResult(parser, input);
      if (lastResult) {
        try {
          obj = {
            localSum: localSum,
            globalSum: globalSum,
            units: units
          };
          updateSum(obj, lastResult);
          localSum = obj.localSum;
          globalSum = obj.globalSum;
          units = obj.units;
        } catch (err) {
          output += formatters.errorLine(item, err.message);
          console.error(`Error updating sum for item: ${item}`, err);
          return;
        }
      }
    }
  });

  return output;
}

function updateMath() {
  let output = evalInput();
  $("#highlights1").html(output);
}

function containsSumKeyword(item) {
  const keywords = ['total', 'sum', 'summe', 'gesamt'];
  return keywords.some(keyword => item.toLowerCase().includes(keyword));
}

function getLastResult(parser, input) {
  const result = parser.evaluate(input);
  if (result && result.length > 0) {
    return result[result.length - 1];
  }
  return null;
}

function updateSum(obj, lastResult) {
  if (math.typeOf(lastResult) === 'Unit') {
    const lastResultSI = lastResult.toSI();
    const valueSI = math.bignumber(lastResultSI.toNumeric());
    
    unitSI = lastResultSI;
    unitSI.value = null;
    
    if (obj.units === null || !unitSI.equalBase(obj.units)) {
      obj.localSum = valueSI;
      obj.globalSum = valueSI;
      obj.units = unitSI;
      return;
    }
    
    obj.localSum = obj.localSum.add(valueSI);
    obj.globalSum = obj.globalSum.add(valueSI);
    obj.units = unitSI;
  } else if (typeof lastResult === 'number' || math.typeOf(lastResult) === 'BigNumber') {
    if (obj.units !== null) {
      obj.localSum = math.bignumber(lastResult);
      obj.globalSum = math.bignumber(lastResult);
      obj.units = null;
    }

    obj.localSum = obj.localSum.add(lastResult);
    obj.globalSum = obj.globalSum.add(lastResult);
  }
}

function evaluateItem(parser, input, item, alignToMaxLength, maxLen, formatters = {}) {
  // Default formatters in case they're not provided
  const defaultFormatters = {
    calculateSpacing: (item) => {
      if (alignToMaxLength) {
        const spacesNeeded = Math.max(1, maxLen - item.length + 2);
        return ' '.repeat(spacesNeeded);
      } else {
        return '\t';
      }
    },
    lineResult: (item, result, alignToMaxLength, maxLen) => {
      const spacing = defaultFormatters.calculateSpacing(item);
      return `${item}${spacing}${result}\n`;
    },
    emptyLine: (item) => `${item}\n`
  };

  // Use provided formatters or fall back to defaults
  const fmt = { ...defaultFormatters, ...formatters };

  if (item.trim() === '') {
    return fmt.emptyLine(item);
  }
  
  const result = parser.evaluate(input);
  if (result === undefined) {
    return fmt.emptyLine(item);
  }
  
  const ev_raw = result.slice(-1);
  const ev_str = JSON.stringify(ev_raw);
  
  if (ev_raw === undefined || ev_str === "[null]") {
    return fmt.emptyLine(item);
  }
  
  return fmt.lineResult(item, ev_raw, alignToMaxLength, maxLen);
}

function clearTextarea() {
  const textareaElement = document.getElementById('frame1');
  
  textareaElement.focus();
  textareaElement.select();
  document.execCommand('delete', false);
  
  textareaElement.selectionStart = 0;
  textareaElement.selectionEnd = 0;
  
  updateMath();
}

function download(filename, text) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function getFormattedDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function downloadInput() {
  const dateTime = getFormattedDateTime();
  const filename = `liveCalc_input_${dateTime}.txt`;
  const content = $("#frame1").val();
  download(filename, content);
  return false;
}

function downloadResults() {
  const dateTime = getFormattedDateTime();
  const filename = `liveCalc_results_${dateTime}.txt`;
  
  const content = exportFormatResults();
  download(filename, content);
  return false;
}

function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
  // Try using the modern clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showCopyMessage(successMsg);
      })
      .catch(err => {
        // If clipboard API fails, use fallback method
        fallbackCopyToClipboard(text, successMsg);
      });
  } else {
    // Fallback for browsers/webviews that don't support clipboard API
    fallbackCopyToClipboard(text, successMsg);
  }
}

function fallbackCopyToClipboard(text, successMsg = 'Copied to clipboard!') {
  try {
    // Create a temporary input element
    const tempInput = document.createElement('input');
    tempInput.style.position = 'fixed';
    tempInput.style.opacity = '0';
    tempInput.value = text;
    document.body.appendChild(tempInput);
    
    // For mobile devices
    tempInput.contentEditable = true;
    tempInput.readOnly = false;
    
    // Select the text and copy
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); // For mobile devices
    
    const successful = document.execCommand('copy');
    document.body.removeChild(tempInput);
    
    if (successful) {
      showCopyMessage(successMsg);
    } else {
      showCopyMessage('Copy failed. Please try again.');
    }
  } catch (err) {
    showCopyMessage('Copy failed. Please try again.');
  }
}

function copyInput() {
  const content = $("#frame1").val();
  copyToClipboard(content, 'Input copied to clipboard!');
  return false;
}

function copyResults() {
  const content = exportFormatResults();
  copyToClipboard(content, 'Results copied to clipboard!');
  return false;
}

function copyURLtoClipboard() {
  const url = window.location.href;
  copyToClipboard(url, 'Link copied to clipboard!');
  return false;
}

function showCopyMessage(message) {
  // Create or get existing message element
  let messageElement = document.getElementById('copyMessage');
  if (!messageElement) {
    messageElement = document.createElement('div');
    messageElement.id = 'copyMessage';
    messageElement.style.position = 'fixed';
    messageElement.style.top = '10%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translateX(-50%)';
    messageElement.style.background = 'rgba(0,0,0,0.7)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 15px';
    messageElement.style.borderRadius = '4px';
    messageElement.style.zIndex = '1000';
    document.body.appendChild(messageElement);
  }
  
  // Set the message and show
  messageElement.textContent = message;
  messageElement.style.display = 'block';
  
  // Hide after 2 seconds
  setTimeout(() => {
    messageElement.style.display = 'none';
  }, 2000);
}

function exportFormatResults() {
  // Define export-specific formatters that add # prefix to results
  const exportFormatters = {
    lineResult: (item, result, alignToMaxLength, maxLen) => {
      const spacing = alignToMaxLength ? 
        ' '.repeat(Math.max(1, maxLen - item.length + 2)) : 
        '\t';
      return `${item}${spacing}# ${result}\n`;
    },
    sumLine: (item, displaySum, alignToMaxLength, maxLen) => {
      const spacing = alignToMaxLength ? 
        ' '.repeat(Math.max(1, maxLen - item.length + 2)) : 
        '\t';
      return `${item}${spacing}# ${displaySum}\n`;
    },
    // Error and empty lines remain unchanged
    errorLine: (item, errorMessage) => `${item}\n`,
    emptyLine: (item) => `${item}\n`
  };
  
  // Use evalInput with our custom formatters
  return evalInput(exportFormatters);
}
