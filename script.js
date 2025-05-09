document.addEventListener('DOMContentLoaded', function() {
  const DEFAULT_PRECISION = 20;
  loadSettings(DEFAULT_PRECISION);

  initializeApp(DEFAULT_PRECISION);
  initializeModal(DEFAULT_PRECISION);
  initializeDarkMode();

  evalMath();
}, false);

function initializeApp(defaultPrecision) {
  const precision = parseInt(localStorage.getItem('precision')) || defaultPrecision;
  
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
    }
  }
  evalMath();

  $('#frame1').on('keyup input change', function() {
    evalMath();
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

function initializeModal(defaultPrecision) {
  const modal = document.getElementById("settingsModal");
  const closeBtn = modal.querySelector(".close");
  
  closeBtn.onclick = function() {
    saveSettings(defaultPrecision);
    modal.style.display = "none";
  }
  
  window.onclick = function(event) {
    if (event.target == modal) {
      saveSettings(defaultPrecision);
      modal.style.display = "none";
    }
  }
  
  $('#showErrors').on('change', function() {
    localStorage.setItem('showErrors', $(this).is(':checked'));
    evalMath();
  });
  
  $('#darkMode').on('change', function() {
    const isDarkMode = $(this).is(':checked');
    localStorage.setItem('darkMode', isDarkMode);
    applyDarkMode(isDarkMode);
  });
  
  $('#useSpaces').on('change', function() {
    localStorage.setItem('useSpaces', $(this).is(':checked'));
    evalMath();
  });
  
  $('#precision').on('change', function() {
    const precision = parseInt($(this).val()) || defaultPrecision;
    localStorage.setItem('precision', precision);
    updatePrecisionConfig(precision);
    evalMath();
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

function loadSettings(defaultPrecision) {
  const showErrorsState = localStorage.getItem('showErrors');
  const showErrors = showErrorsState !== null ? showErrorsState === 'true' : true;
  $('#showErrors').prop('checked', showErrors);
  
  const darkModeState = localStorage.getItem('darkMode');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const darkMode = darkModeState !== null ? darkModeState === 'true' : prefersDarkScheme;
  $('#darkMode').prop('checked', darkMode);
  
  const alignmentState = localStorage.getItem('useSpaces');
  const useSpaces = alignmentState !== null ? alignmentState === 'true' : false;
  $('#useSpaces').prop('checked', useSpaces);
  
  const precisionState = localStorage.getItem('precision');
  const precision = precisionState !== null ? parseInt(precisionState) : defaultPrecision;
  $('#precision').val(precision);
}

function saveSettings(defaultPrecision) {
  const showErrors = $('#showErrors').is(':checked');
  const darkMode = $('#darkMode').is(':checked');
  const useSpaces = $('#useSpaces').is(':checked');
  const precision = parseInt($('#precision').val()) || defaultPrecision;
  
  localStorage.setItem('showErrors', showErrors);
  localStorage.setItem('darkMode', darkMode);
  localStorage.setItem('useSpaces', useSpaces);
  localStorage.setItem('precision', precision);
  
  // Update math precision config when settings are saved
  updatePrecisionConfig(precision);
  evalMath();
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
    if (decompressed !== null && decompressed.length > 0) {
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

function evalMath() {
  const parser = math.parser();
  let output = '';
  let input = [];
  let formulas = $('#frame1').val();
  
  const showErrors = localStorage.getItem('showErrors') !== 'false';
  const useSpaces = localStorage.getItem('useSpaces') === 'true';

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
      
      if (useSpaces) {
        const spacesNeeded = Math.max(1, maxLen - item.length + 2);
        const spacing = ' '.repeat(spacesNeeded);
        output += `${item}${spacing}<span class="sum-value">${displaySum}</span>\n`;
      } else {
        output += `${item}\t<span class="sum-value">${displaySum}</span>\n`;
      }
      
      localSum = math.bignumber(0);
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
      const evaluationResult = evaluateItem(parser, input, item, maxLen, useSpaces);
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

function evaluateItem(parser, input, item, maxLen, useSpaces) {
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

  let spacing;
  
  if (useSpaces) {
    const spacesNeeded = Math.max(1, maxLen - item.length + 2);
    spacing = ' '.repeat(spacesNeeded);
  } else {
    spacing = '\t';
  }
  
  const baseMatch = item.match(/\bto\s+(hex|bin|oct|dec)\b/i);
  
  if (baseMatch && typeof ev_raw[0] !== 'undefined') {
    const base = baseMatch[1].toLowerCase();
    try {
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
  $('#frame1').val(decodeDataFromURL('QSA9ICgxLjIgLyAoMy4zICsgMS43KSkgY20KQiA9IDUuMDggY20gKyAyLjUgaW5jaApDID0gQiAqIEIgKiBBIGluIGNtMwoKCg=='));
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
