document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  initializeModal();
  initializeDarkMode();
}, false);

function initializeApp() {
  math.config({
    number: 'BigNumber',
    precision: 64,
    relTol: 1e-60,
    absTol: 1e-63,
  });

  extendMathJsWithBaseConversions();
  
  // Load settings from localStorage
  const showErrorsState = localStorage.getItem('showErrors');
  if (showErrorsState !== null) {
    $('#showErrors').prop('checked', showErrorsState === 'true');
  }
  
  const hashvalue = window.location.hash.substring(1);
  if (hashvalue.length > 4) {
    $('#frame1').val(b64_to_utf8(hashvalue));
  } else {
    // If no hash value, try to restore from localStorage
    const lastInput = localStorage.getItem('liveCalcLastInput');
    if (lastInput) {
      $('#frame1').val(lastInput);
    }
  }
  evalMath();

  // Direct evaluation with multiple events to catch all typing scenarios
  $('#frame1').on('keyup input change', function() {
    evalMath();
    // Only update hash when needed, not on every keypress
    if (!$(this).data('typing')) {
      $(this).data('typing', true);
      setTimeout(() => {
        const encodedMath = utf8_to_b64($('#frame1').val());
        window.location.hash = encodedMath;
        // Save current input to localStorage
        localStorage.setItem('liveCalcLastInput', $('#frame1').val());
        $(this).data('typing', false);
      }, 1000); // Only update URL hash once per second
    }
  });

  // Improved scroll sync - this handles the horizontal scrolling properly
  $('#frame1').on('scroll', function() {
    $('.bed-highlights').css('transform', `translate(${-this.scrollLeft}px, ${-this.scrollTop}px)`);
  });
}

// Initialize the settings modal
function initializeModal() {
  const modal = document.getElementById("settingsModal");
  const closeBtn = modal.querySelector(".close");
  
  // Close the modal when clicking the X button and save settings
  closeBtn.onclick = function() {
    saveSettings();
    modal.style.display = "none";
  }
  
  // Close the modal when clicking outside of it and save settings
  window.onclick = function(event) {
    if (event.target == modal) {
      saveSettings();
      modal.style.display = "none";
    }
  }
  
  // Update show errors setting when checkbox changes
  $('#showErrors').on('change', function() {
    localStorage.setItem('showErrors', $(this).is(':checked'));
    evalMath();
  });
  
  // Update dark mode setting when checkbox changes
  $('#darkMode').on('change', function() {
    const isDarkMode = $(this).is(':checked');
    localStorage.setItem('darkMode', isDarkMode);
    applyDarkMode(isDarkMode);
  });
}

// Initialize dark mode based on saved preference
function initializeDarkMode() {
  const darkModeState = localStorage.getItem('darkMode');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Set checkbox based on saved preference or system preference
  const shouldEnableDarkMode = darkModeState !== null 
    ? darkModeState === 'true' 
    : prefersDarkScheme;
    
  $('#darkMode').prop('checked', shouldEnableDarkMode);
  applyDarkMode(shouldEnableDarkMode);
  
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem('darkMode') === null) {
      // Only auto-switch if user hasn't set a preference
      const newDarkModeState = e.matches;
      $('#darkMode').prop('checked', newDarkModeState);
      applyDarkMode(newDarkModeState);
    }
  });
}

// Apply dark mode to the document
function applyDarkMode(isDarkMode) {
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

// Open the settings modal
function openSettings() {
  const modal = document.getElementById("settingsModal");
  modal.style.display = "block";
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem('showErrors', $('#showErrors').is(':checked'));
  localStorage.setItem('darkMode', $('#darkMode').is(':checked'));
  applyDarkMode($('#darkMode').is(':checked'));
  evalMath();
}

/**
 * Extends math.js with custom functions for base conversions
 */
function extendMathJsWithBaseConversions() {
  // Define base conversion configurations
  const baseConfigs = {
    hex: { base: 16, prefix: '0x' },
    bin: { base: 2, prefix: '0b' },
    oct: { base: 8, prefix: '0o' },
    dec: { base: 10, prefix: '' }
  };
  
  // Create conversion functions dynamically
  const conversions = {};
  
  // Create to_base functions
  Object.keys(baseConfigs).forEach(baseType => {
    conversions[`to_${baseType}`] = function(value) {
      // Check if it's a unit
      if (math.typeOf(value) === 'Unit') {
        throw new Error('Must be unitless');
      }
      
      // For non-decimal bases, check for floating point
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
  
  // Create from_base functions (except dec which is handled by default)
  Object.keys(baseConfigs).forEach(baseType => {
    if (baseType === 'dec') return; // Skip dec as it's the default
    const config = baseConfigs[baseType];
    conversions[`from_${baseType}`] = function(value) {
      if (typeof value === 'string') {
        value = value.toLowerCase().replace(new RegExp(`^${config.prefix}`), '');
      }
      return parseInt(value, config.base);
    };
  });
  
  // Import all conversion functions
  math.import(conversions);
  
  // Override math.parse to handle base conversion expressions
  const originalParse = math.parse;
  math.parse = function(expr) {
    if (typeof expr === 'string') {
      // Process base literals
      Object.keys(baseConfigs).forEach(baseType => {
        if (baseType === 'dec') return; // Skip dec as it has no prefix
        const config = baseConfigs[baseType];
        const regex = new RegExp(`${config.prefix}([0-9a-fA-F]+)`, 'g');
        expr = expr.replace(regex, `from_${baseType}("$1")`);
      });
      
      // Process natural language expressions
      const conversionKeywords = ['in', 'to'];
      conversionKeywords.forEach(keyword => {
        Object.keys(baseConfigs).forEach(baseType => {
          // Match the entire expression before the conversion keyword
          const pattern = new RegExp(`(.+?)\\s+${keyword}\\s+${baseType}(?:\\b|$)`, 'gi');
          expr = expr.replace(pattern, (match, group) => {
            // Check for balanced parentheses in the group
            if (group.trim()) {
              return `to_${baseType}(${group})`;
            }
            return match; // If no group captured, return the original match
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

function evalMath() {
  const parser = math.parser();
  let output = '';
  let input = [];
  let formulas = $('#frame1').val();
  const showErrors = $('#showErrors').is(':checked');

  if (formulas.includes(",") && !formulas.includes(".")) {
    formulas = formulas.replace(/(\d+),(\d+)/gi, "$1.$2");
  }

  const arrayOfLines = formulas.split('\n');
  let globalSum = math.bignumber(0);
  let localSum = math.bignumber(0);
  let units = null;
  const maxLen = Math.max(...arrayOfLines.map(item => item.length));

  arrayOfLines.forEach(item => {
    if (containsSumKeyword(item)) {
      const displaySum = units ? new math.Unit(localSum, units).simplify() : localSum.toString();
      output += `${item}\t<span class="sum-value">${displaySum}</span>\n`;
      localSum = math.bignumber(0); // Reset local sum after each Summe keyword
    } else {
      try {
        parser.evaluate(item);
      } catch (err) {
        if (showErrors) {
          output += `${item} <span class="error-text">&lt;${err.message}&gt;</span>\n`;
        } else {
          output += `${item}\n`;
        }
        console.error(`Error evaluating item: "${item}": ${err.message}`);
        return;
      }

      input.push(item);
      const evaluationResult = evaluateItem(parser, input, item, maxLen);
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
          output += `${item} <span class="error-text">&lt;${err.message}&gt;</span>\n`;
          console.error(`Error updating sum for item: ${item}`, err);
          return;
        }
      }
    }
  });

  $("#highlights1").html(output);
}

// Rest of the functions remain the same
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
    const valueSI = lastResultSI.toNumeric();
    
    // Make it valueless
    unitSI = lastResultSI;
    unitSI.value = null;
    5
    // If units change, reset both sums
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
    // If we had units before but now we don't, reset sums
    if (obj.units !== null) {
      obj.localSum = math.bignumber(lastResult);
      obj.globalSum = math.bignumber(lastResult);
      obj.units = null;
    }

    obj.localSum = obj.localSum.add(lastResult);
    obj.globalSum = obj.globalSum.add(lastResult);
  }
}

function evaluateItem(parser, input, item, maxLen) {
  if (item.trim() === '') {
    return `${item}\n`;
  }
  
  const result = parser.evaluate(input);
  if (result === undefined) {
    return `${item}\n`;
  }
  
  const ev_raw = result.slice(-1);
  const ev_str = JSON.stringify(ev_raw);
  
  if (ev_raw === undefined || ev_str === "[null]") {
    return `${item}\n`;
  } 

  const spacing = "\t";
  
  // Check if the expression has a base conversion pattern like "to hex", "to bin", etc.
  const baseMatch = item.match(/\bto\s+(hex|bin|oct|dec)\b/i);
  
  if (baseMatch && typeof ev_raw[0] !== 'undefined') {
    const base = baseMatch[1].toLowerCase();
    // Use the existing conversion functions instead of duplicating logic
    try {
      // Use the to_base function we already defined in extendMathJsWithBaseConversions
      const convertedValue = math.evaluate(`to_${base}(${ev_raw})`);
      return `${item}${spacing} = ${convertedValue}\n`;
    } catch (e) {
      console.error(`Base conversion error: ${e.message}`);
    }
  }
  
  return `${item}${spacing}${ev_raw}\n`;
}

function clearTextarea() {
  $('#frame1').val('');
  evalMath();
}

function insertExample() {
  $('#frame1').val(b64_to_utf8('QSA9ICgxLjIgLyAoMy4zICsgMS43KSkgY20KQiA9IDUuMDggY20gKyAyLjUgaW5jaApDID0gQiAqIEIgKiBBIGluIGNtMwoKCg=='));
  evalMath();
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

function downloadMath() {
  const filename = window.prompt('Save calculation as:', 'liveCalc.txt');
  const content = $("#highlights1").text().replace(/ +/g, " ");
  download(filename, content);
  return false;
}

function copyURLtoClipboard() {
  navigator.clipboard.writeText(window.location.href);
}
