// --- Lógica Principal de la Aplicación ---

document.addEventListener('DOMContentLoaded', () => {
  // --- Elementos del DOM ---
  const inputForeign = document.getElementById('input-foreign');
  const inputVes = document.getElementById('input-ves');
  const rateCalcText = document.getElementById('rate-calc-text');
  const rateUpdateText = document.getElementById('rate-update-text');
  
  const foreignDropdownItems = document.querySelectorAll('#foreign-selector-row .selector-btn');
  const vesDropdownItems = document.querySelectorAll('#ves-selector-row .selector-btn');
  
  const foreignSymbol = document.getElementById('foreign-symbol');
  const vesSymbol = document.getElementById('ves-symbol');
  
  const calculatorCard = document.querySelector('.calculator-card');
  const swapBtn = document.querySelector('.swap-icon');
  
  // Elementos del Teclado Numérico Personalizado
  const keypadContainer = document.getElementById('keypad-container');
  
  // Elementos de Instalación PWA
  const androidPrompt = document.getElementById('android-install-prompt');
  const btnTriggerInstall = document.getElementById('btn-trigger-install');
  const btnCancelInstall = document.getElementById('btn-cancel-install');
  
  const iosSheet = document.getElementById('ios-install-sheet');
  const closeIosSheet = document.getElementById('close-ios-sheet');

  // --- SVGs de Divisas para los Inputs ---
  const currencySvgs = {
    USD: `<svg viewBox="0 0 24 24" class="svg-icon"><use href="#flag-usd"/></svg>`,
    EUR: `<svg viewBox="0 0 24 24" class="svg-icon"><use href="#flag-eur"/></svg>`,
    USDT: `<svg viewBox="0 0 24 24" class="svg-icon"><use href="#flag-usdt"/></svg>`,
    VES: `<svg viewBox="0 0 24 24" class="svg-icon"><use href="#flag-ves"/></svg>`,
    Custom: `<svg viewBox="0 0 24 24" class="svg-icon"><use href="#flag-custom"/></svg>`
  };

  // Símbolos de cada divisa
  const currencySymbols = {
    USD: '$',
    EUR: '€',
    USDT: '₮',
    Custom: '★',
    VES: 'Bs.'
  };

  // --- Retroalimentación Háptica ---
  function vibrarTeclado() {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch (e) {
        console.warn('Vibration API blocked or not supported:', e);
      }
    }
  }

  // --- Parser y Evaluación de Fórmulas Matemáticas ---
  function evaluarExpresionIncompleta(formula) {
    if (!formula) return NaN;
    
    let s = desformatearCantidad(formula);
    s = s.trim();
    
    // Reemplazar operadores visuales si los hubiere
    s = s.replace(/×/g, '*').replace(/÷/g, '/');
    
    // Remover recursivamente operadores colgantes o puntos decimales al final
    while (true) {
      const originalLength = s.length;
      s = s.replace(/[\+\-\*\/]+$/, '').trim();
      s = s.replace(/\.+$/, '').trim();
      if (s.length === originalLength) {
        break;
      }
    }
    
    if (s === '') return NaN;
    
    // Validar caracteres permitidos (solo números, operadores, espacios y puntos decimales)
    if (!/^[0-9\+\-\*\/\.\s]+$/.test(s)) {
      return NaN;
    }
    
    try {
      const result = new Function(`return (${s})`)();
      return typeof result === 'number' && isFinite(result) ? result : NaN;
    } catch (e) {
      return NaN;
    }
  }

  // --- Funciones de Formateo de Cantidades ---
  function formatearCantidad(valor, decimales = 2) {
    if (isNaN(valor) || valor === null || valor === '') return '';
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales
    }).format(valor);
  }

  function desformatearCantidad(texto) {
    if (!texto) return '';
    return texto.toString()
      .replace(/\./g, '')
      .replace(/,/g, '.');
  }

  // --- Estado de la Aplicación ---
  let activeForeignCurrency = 'USD'; // USD, EUR, USDT, Custom
  let activeVesCurrency = 'VES';       // VES, EUR
  let isReversed = false;             // false: Foreign -> VES/EUR, true: VES/EUR -> Foreign
  let deferredPrompt = null;          // Almacena el evento de instalación de Android
  let isEditingRate = false;          // Indica si el usuario está editando activamente la tasa
  let rateEditStarted = false;         // Indica si se ha iniciado la escritura de la tasa en limpio
  let clearOnNextKey = true;          // Flag para sobrescribir el valor inicial
  
  // Tasas de cambio en memoria (Valores activos de cálculo)
  const rates = {
    USD: 45.0,
    EUR: 49.0,
    USDT: 45.5,
    Custom: 45.0
  };

  // Tasas oficiales de la API (Salvaguarda para restablecer)
  const officialRates = {
    USD: 45.0,
    EUR: 49.0,
    USDT: 45.5
  };

  // Indicador de si el usuario ha definido una tasa personalizada manual
  const isManualRate = {
    USD: false,
    EUR: false,
    USDT: false,
    Custom: true
  };

  const updateTimes = {
    USD: '',
    EUR: '',
    USDT: '',
    Custom: 'Definida por el usuario'
  };

  // --- Funciones Auxiliares de Divisas y Tasas ---
  function obtenerDivisaDeTasaEditable() {
    if (activeForeignCurrency !== 'VES') {
      return activeForeignCurrency;
    }
    return activeVesCurrency;
  }

  function obtenerTasaEnVes(c) {
    if (c === 'VES') return 1.0;
    return rates[c] || 0;
  }

  // --- Inicialización de la Aplicación ---
  cargarTasasLocales();
  consultarAPIs();

  // --- Cargar y Guardar Datos en LocalStorage ---
  function cargarTasasLocales() {
    const savedRates = localStorage.getItem('calc_rates');
    const savedOfficialRates = localStorage.getItem('calc_official_rates');
    const savedIsManual = localStorage.getItem('calc_is_manual_rate');
    const savedTimes = localStorage.getItem('calc_update_times');
    
    if (savedRates) {
      Object.assign(rates, JSON.parse(savedRates));
    }
    if (savedOfficialRates) {
      Object.assign(officialRates, JSON.parse(savedOfficialRates));
    } else if (savedRates) {
      Object.assign(officialRates, JSON.parse(savedRates));
    }
    if (savedIsManual) {
      Object.assign(isManualRate, JSON.parse(savedIsManual));
    }
    if (savedTimes) {
      Object.assign(updateTimes, JSON.parse(savedTimes));
    }
    
    actualizarDisplayTasa();
  }

  // Guardar en LocalStorage
  function guardarTasasLocales() {
    localStorage.setItem('calc_rates', JSON.stringify(rates));
    localStorage.setItem('calc_official_rates', JSON.stringify(officialRates));
    localStorage.setItem('calc_is_manual_rate', JSON.stringify(isManualRate));
    localStorage.setItem('calc_update_times', JSON.stringify(updateTimes));
  }

  // --- Consultas a APIs ---
  async function consultarAPIs() {
    if (!navigator.onLine) return;

    // 1. Obtener USD (BCV Oficial)
    try {
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (response.ok) {
        const data = await response.json();
        const valorOficial = data.promedio || data.venta;
        officialRates.USD = valorOficial;
        updateTimes.USD = formatearFecha(data.fechaActualizacion);
        
        if (!isManualRate.USD) {
          rates.USD = valorOficial;
        }
      }
    } catch (err) {
      console.warn('Error al obtener tasa USD BCV:', err);
    }

    // 2. Obtener EUR (BCV Oficial)
    try {
      const response = await fetch('https://ve.dolarapi.com/v1/euros/oficial');
      if (response.ok) {
        const data = await response.json();
        const valorOficial = data.promedio || data.venta;
        officialRates.EUR = valorOficial;
        updateTimes.EUR = formatearFecha(data.fechaActualizacion);
        
        if (!isManualRate.EUR) {
          rates.EUR = valorOficial;
        }
      }
    } catch (err) {
      console.warn('Error al obtener tasa EUR BCV:', err);
    }

    // 3. Obtener USDT (Binance P2P)
    try {
      const response = await fetch('https://criptoya.com/api/binancep2p/USDT/VES/1');
      if (response.ok) {
        const data = await response.json();
        let valorOficial = 0;
        if (data.ask && data.bid) {
          valorOficial = (parseFloat(data.ask) + parseFloat(data.bid)) / 2;
        } else {
          valorOficial = parseFloat(data.ask || data.bid);
        }
        officialRates.USDT = valorOficial;
        updateTimes.USDT = formatearFecha(new Date().toISOString());
        
        if (!isManualRate.USDT) {
          rates.USDT = valorOficial;
        }
      }
    } catch (err) {
      console.warn('Error al obtener tasa USDT Binance:', err);
    }

    guardarTasasLocales();
    actualizarDisplayTasa();
    recalcularConversiones();
  }

  function formatearFecha(isoString) {
    if (!isoString) return 'No disponible';
    const date = new Date(isoString);
    
    const meses = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
    const dia = date.getDate();
    const mes = meses[date.getMonth()];
    
    let horas = date.getHours();
    const minutos = date.getMinutes().toString().padStart(2, '0');
    const ampm = horas >= 12 ? 'p. m.' : 'a. m.';
    
    horas = horas % 12;
    horas = horas ? horas : 12; // el número 0 debe ser 12
    
    return `Actualizado ${dia} ${mes} a las ${horas}:${minutos} ${ampm}`;
  }
  // --- Visibilidad Condicional del Selector Destino ---
  function actualizarVisibilidadBotonesDestino() {
    // 1. Obtener todos los botones de ambos selectores
    const btnVes_Ves = document.querySelector('#ves-selector-row .selector-btn[data-currency="VES"]');
    const btnVes_Eur = document.querySelector('#ves-selector-row .selector-btn[data-currency="EUR"]');
    const btnVes_Usd = document.querySelector('#ves-selector-row .selector-btn[data-currency="USD"]');
    const btnVes_Custom = document.querySelector('#ves-selector-row .selector-btn[data-currency="Custom"]');
    
    const btnForeign_Usd = document.querySelector('#foreign-selector-row .selector-btn[data-currency="USD"]');
    const btnForeign_Eur = document.querySelector('#foreign-selector-row .selector-btn[data-currency="EUR"]');
    const btnForeign_Usdt = document.querySelector('#foreign-selector-row .selector-btn[data-currency="USDT"]');
    const btnForeign_Custom = document.querySelector('#foreign-selector-row .selector-btn[data-currency="Custom"]');
    const btnForeign_Ves = document.querySelector('#foreign-selector-row .selector-btn[data-currency="VES"]');
    
    // Mostrar todos inicialmente
    if (btnVes_Ves) btnVes_Ves.classList.remove('hidden');
    if (btnVes_Eur) btnVes_Eur.classList.remove('hidden');
    if (btnVes_Usd) btnVes_Usd.classList.remove('hidden');
    if (btnVes_Custom) btnVes_Custom.classList.remove('hidden');
    
    if (btnForeign_Usd) btnForeign_Usd.classList.remove('hidden');
    if (btnForeign_Eur) btnForeign_Eur.classList.remove('hidden');
    if (btnForeign_Usdt) btnForeign_Usdt.classList.remove('hidden');
    if (btnForeign_Custom) btnForeign_Custom.classList.remove('hidden');
    if (btnForeign_Ves) btnForeign_Ves.classList.remove('hidden');
    
    if (!isReversed) {
      // El selector origen es #foreign-selector-row. El selector destino (abajo) es #ves-selector-row.
      // Ocultar botón VES arriba
      if (btnForeign_Ves) btnForeign_Ves.classList.add('hidden');
      
      // Ocultar botón Custom abajo
      if (btnVes_Custom) btnVes_Custom.classList.add('hidden');
      
      if (activeForeignCurrency === 'USD') {
        if (btnVes_Usd) btnVes_Usd.classList.add('hidden');
        if (activeVesCurrency === 'USD') {
          activeVesCurrency = 'VES';
        }
      } else if (activeForeignCurrency === 'EUR') {
        if (btnVes_Eur) btnVes_Eur.classList.add('hidden');
        if (activeVesCurrency === 'EUR') {
          activeVesCurrency = 'VES';
        }
      } else if (activeForeignCurrency === 'USDT' || activeForeignCurrency === 'Custom') {
        if (btnVes_Usd) btnVes_Usd.classList.add('hidden');
        if (btnVes_Eur) btnVes_Eur.classList.add('hidden');
        activeVesCurrency = 'VES';
      }
    } else {
      // El selector origen es #ves-selector-row. El selector destino (abajo) es #foreign-selector-row.
      // Ocultar botón Custom abajo
      if (btnForeign_Custom) btnForeign_Custom.classList.add('hidden');
      
      // Ocultar siempre USD arriba en modo invertido
      if (btnVes_Usd) btnVes_Usd.classList.add('hidden');
      
      // Si la divisa activa superior es USD en modo invertido (lo cual no debe ocurrir), reasignar a VES
      if (activeVesCurrency === 'USD') {
        activeVesCurrency = 'VES';
      }
      
      if (activeVesCurrency === 'VES') {
        if (btnForeign_Ves) btnForeign_Ves.classList.add('hidden');
        if (activeForeignCurrency === 'VES') {
          activeForeignCurrency = 'USD';
        }
      } else if (activeVesCurrency === 'EUR') {
        if (btnForeign_Usdt) btnForeign_Usdt.classList.add('hidden');
        if (btnForeign_Eur) btnForeign_Eur.classList.add('hidden');
        if (activeForeignCurrency !== 'USD' && activeForeignCurrency !== 'VES') {
          activeForeignCurrency = 'USD';
        }
      }
    }
  }


  // --- Actualizar Interfaz según Divisas Activas ---
  function actualizarDisplayTasa() {
    actualizarVisibilidadBotonesDestino();
    
    const tasaActual = rates[obtenerDivisaDeTasaEditable()];
    
    // 1. Actualizar símbolos de entrada
    if (foreignSymbol) {
      foreignSymbol.textContent = currencySymbols[activeForeignCurrency];
    }
    if (vesSymbol) {
      vesSymbol.textContent = currencySymbols[activeVesCurrency];
    }
 
    // Cambiar el color de acento de la aplicación según la divisa origen activa (dinámica)
    const divisaOrigenActiva = !isReversed ? activeForeignCurrency : activeVesCurrency;
    const accentKey = divisaOrigenActiva;
    document.documentElement.style.setProperty('--accent-color', `var(--color-${accentKey.toLowerCase()})`);
    document.documentElement.style.setProperty('--accent-color-rgb', `var(--color-${accentKey.toLowerCase()}-rgb)`);
 
    // Actualizar los dropdown-items del selector superior
    foreignDropdownItems.forEach(item => {
      if (item.dataset.currency === activeForeignCurrency) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
 
    // Actualizar los dropdown-items del selector inferior
    vesDropdownItems.forEach(item => {
      if (item.dataset.currency === activeVesCurrency) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
 
    if (isEditingRate) {
      rateCalcText.classList.add('editing-rate');
      return;
    } else {
      rateCalcText.classList.remove('editing-rate');
    }
 
    // Actualizar texto de tasa
    const origenCode = !isReversed ? activeForeignCurrency : activeVesCurrency;
    const destinoCode = !isReversed ? activeVesCurrency : activeForeignCurrency;
    
    const tOrigen = obtenerTasaEnVes(origenCode);
    const tDestino = obtenerTasaEnVes(destinoCode);
    const tasaEquiv = tDestino > 0 ? (tOrigen / tDestino) : 0;
    
    const simbOrigen = currencySymbols[origenCode];
    const simbDestino = currencySymbols[destinoCode];
    
    const formatearSimb = (c, simb) => {
      if (c === 'Custom') return '';
      if (c === 'VES') return 'Bs. ';
      return simb;
    };
    
    const sOrigen = formatearSimb(origenCode, simbOrigen);
    const sDestino = formatearSimb(destinoCode, simbDestino);
    
    rateCalcText.textContent = `${sOrigen}1 = ${sDestino}${formatearCantidad(tasaEquiv, 2)}`;
    
    // Actualizar fecha
    const divisaEditable = obtenerDivisaDeTasaEditable();
    if (divisaEditable === 'Custom') {
      rateUpdateText.textContent = 'Tasa personalizada del usuario';
    } else {
      rateUpdateText.textContent = updateTimes[divisaEditable] || 'Actualizado recientemente';
    }
  }

  // --- Lógica de Conversión ---
  function realizarConversion() {
    const tasaOrigen = obtenerTasaEnVes(activeForeignCurrency);
    const tasaDestino = obtenerTasaEnVes(activeVesCurrency);
    
    if (!isReversed) {
      // Conversión: Divisa Extranjera (Arriba) -> Destino (Abajo)
      const formula = inputForeign.value;
      const valorDivisa = evaluarExpresionIncompleta(formula);
      
      if (isNaN(valorDivisa) || valorDivisa <= 0) {
        if (document.activeElement !== inputVes) {
          inputVes.value = '';
        }
        return;
      }
      
      const resultado = valorDivisa * (tasaOrigen / tasaDestino);
      if (document.activeElement !== inputVes) {
        inputVes.value = formatearCantidad(resultado, 2);
      }
    } else {
      // Conversión: Destino (Abajo) -> Divisa Extranjera (Arriba)
      const formula = inputVes.value;
      const valorDestino = evaluarExpresionIncompleta(formula);
      
      if (isNaN(valorDestino) || valorDestino <= 0) {
        if (document.activeElement !== inputForeign) {
          inputForeign.value = '';
        }
        return;
      }
      
      const resultado = valorDestino * (tasaDestino / tasaOrigen);
      if (document.activeElement !== inputForeign) {
        inputForeign.value = formatearCantidad(resultado, 2);
      }
    }
  }

  function recalcularConversiones() {
    realizarConversion();
  }

  // Escuchar cambios nativos por si acaso
  inputForeign.addEventListener('input', () => {
    realizarConversion();
  });

  inputVes.addEventListener('input', () => {
    realizarConversion();
  });

  // Eventos Blur para evaluar y formatear las cantidades al salir
  inputForeign.addEventListener('blur', () => {
    const valor = evaluarExpresionIncompleta(inputForeign.value);
    if (!isNaN(valor) && valor > 0) {
      inputForeign.value = formatearCantidad(valor, 2);
    } else {
      inputForeign.value = '';
    }
    realizarConversion();
  });

  inputVes.addEventListener('blur', () => {
    const valor = evaluarExpresionIncompleta(inputVes.value);
    if (!isNaN(valor) && valor > 0) {
      inputVes.value = formatearCantidad(valor, 2);
    } else {
      inputVes.value = '';
    }
    realizarConversion();
  });

  // --- Botón de Intercambio (Swap) ---
  swapBtn.addEventListener('click', () => {
    const nuevoInput = (activeInput === inputForeign) ? inputVes : inputForeign;
    cambiarInputActivo(nuevoInput);
    nuevoInput.focus();
  });

  // --- Lógica del Teclado Numérico Personalizado ---
  const keypadButtons = document.querySelectorAll('.keypad-btn');
  let activeInput = inputForeign; // Por defecto Foreign activo (arriba)

  // Configuración de foco inicial
  document.getElementById('group-foreign').classList.add('active');
  document.getElementById('group-ves').classList.remove('active');
  inputForeign.readOnly = false;
  inputVes.readOnly = true;

  function cambiarInputActivo(nuevoInput) {
    if (isEditingRate) confirmarTasaManual();
    
    if (activeInput !== nuevoInput) {
      // Obtener el valor numérico crudo del input que estaba activo (arriba)
      const valorPrevioRaw = evaluarExpresionIncompleta(activeInput.value);
      
      activeInput = nuevoInput;
      clearOnNextKey = true; // Reiniciar la sobrescritura
      
      if (activeInput === inputForeign) {
        isReversed = false;
        calculatorCard.classList.remove('reversed');
        document.getElementById('group-foreign').classList.add('active');
        document.getElementById('group-ves').classList.remove('active');
        inputForeign.readOnly = false;
        inputVes.readOnly = true;
      } else {
        isReversed = true;
        calculatorCard.classList.add('reversed');
        document.getElementById('group-ves').classList.add('active');
        document.getElementById('group-foreign').classList.remove('active');
        inputVes.readOnly = false;
        inputForeign.readOnly = true;
      }
      
      // Asignar el valor numérico del origen anterior al nuevo input activo (arriba)
      if (!isNaN(valorPrevioRaw) && valorPrevioRaw > 0) {
        activeInput.value = formatearCantidad(valorPrevioRaw, 2);
      } else {
        activeInput.value = '';
      }
      
      actualizarDisplayTasa();
      realizarConversion();
    } else {
      // Mantener consistencia si es el mismo input
      if (activeInput === inputForeign) {
        inputForeign.readOnly = false;
        inputVes.readOnly = true;
      } else {
        inputVes.readOnly = false;
        inputForeign.readOnly = true;
      }
    }
  }

  // Escuchadores de Foco y Clic en Inputs
  inputForeign.addEventListener('focus', () => {
    cambiarInputActivo(inputForeign);
  });

  inputVes.addEventListener('focus', () => {
    cambiarInputActivo(inputVes);
  });

  inputForeign.addEventListener('pointerdown', () => {
    cambiarInputActivo(inputForeign);
  });

  inputVes.addEventListener('pointerdown', () => {
    cambiarInputActivo(inputVes);
  });

  // Activar modo edición de tasa
  function activarEdicionTasa() {
    isEditingRate = true;
    rateEditStarted = false;
    rateCalcText.classList.add('editing-rate');
    
    // Obtener valor de la tasa activa y mostrar la coma visual
    const tasaActual = rates[obtenerDivisaDeTasaEditable()];
    rateCalcText.textContent = tasaActual.toString().replace(/\./g, ',');
  }

  function confirmarTasaManual() {
    isEditingRate = false;
    rateCalcText.classList.remove('editing-rate');
    
    let valorTexto = rateCalcText.textContent.trim().replace(/,/g, '.').replace(/[^\d\.]/g, '');
    let valorFinal = parseFloat(valorTexto);
    
    const divisaEditable = obtenerDivisaDeTasaEditable();
    if (isNaN(valorFinal) || valorFinal <= 0) {
      if (divisaEditable === 'Custom') {
        rates.Custom = 45.0;
      } else {
        rates[divisaEditable] = officialRates[divisaEditable];
        isManualRate[divisaEditable] = false;
      }
    } else {
      if (divisaEditable === 'Custom') {
        rates.Custom = valorFinal;
      } else {
        rates[divisaEditable] = valorFinal;
        isManualRate[divisaEditable] = true;
      }
    }
    
    guardarTasasLocales();
    actualizarDisplayTasa();
    realizarConversion();
  }

  // Escuchadores de Tasa
  rateCalcText.addEventListener('click', (e) => {
    e.stopPropagation();
    activarEdicionTasa();
  });

  // Confirmar tasa manual al hacer clic fuera del texto de tasa si está editando
  document.addEventListener('pointerdown', (e) => {
    if (isEditingRate && !e.target.closest('#rate-calc-text') && !e.target.closest('.keypad-btn')) {
      confirmarTasaManual();
    }
  });

  // --- Manejadores de los Selectores Horizontales ---
  foreignDropdownItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectedCurrency = item.dataset.currency;
      
      if (activeForeignCurrency !== selectedCurrency) {
        activeForeignCurrency = selectedCurrency;
        actualizarDisplayTasa();
        
        if (!isReversed) {
          // Si no está invertido, foreign es el origen (arriba)
          inputForeign.value = formatearCantidad(1, 2);
          clearOnNextKey = true;
        }
        
        realizarConversion();
        
        // Si selecciona personalizada, activar inmediatamente la edición
        if (selectedCurrency === 'Custom') {
          setTimeout(() => {
            activarEdicionTasa();
          }, 100);
        }
      }
    });
  });

  vesDropdownItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectedCurrency = item.dataset.currency;
      
      if (selectedCurrency === 'Custom') {
        // Al seleccionar Custom arriba estando invertido, volvemos a modo normal con Custom activo
        activeForeignCurrency = 'Custom';
        activeVesCurrency = 'VES';
        isReversed = false;
        calculatorCard.classList.remove('reversed');
        cambiarInputActivo(inputForeign);
        inputForeign.value = formatearCantidad(1, 2);
        clearOnNextKey = true;
        
        actualizarDisplayTasa();
        realizarConversion();
        
        setTimeout(() => {
          activarEdicionTasa();
        }, 100);
        return;
      }
      
      if (activeVesCurrency !== selectedCurrency) {
        activeVesCurrency = selectedCurrency;
        actualizarDisplayTasa();
        
        if (isReversed) {
          // Si está invertido, ves es el origen (arriba)
          inputVes.value = formatearCantidad(1, 2);
          clearOnNextKey = true;
        }
        
        realizarConversion();
      }
    });
  });

  // --- Lógica del Teclado Numérico In-App ---
  keypadButtons.forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      vibrarTeclado();
      btn.classList.add('active-touch');
      
      const key = btn.dataset.key;

      // LÓGICA DE ESCRITURA EN EDICIÓN DE TASA
      if (isEditingRate) {
        let valorActualTasa = rateCalcText.textContent;
        let valorActualTasaCrudo = valorActualTasa.replace(/,/g, '.').replace(/[^\d\.]/g, '');
        
        if (key === 'check') {
          confirmarTasaManual();
          return;
        }
        
        if (key === 'C') {
          rateCalcText.textContent = '0';
          rates[obtenerDivisaDeTasaEditable()] = 0;
          rateEditStarted = false;
          realizarConversion();
          return;
        }

        if (['+', '-'].includes(key)) {
          return; // ignorar operadores en tasa
        }
        
        if (!rateEditStarted) {
          if (key === 'backspace') {
            rateCalcText.textContent = '0';
            rates[obtenerDivisaDeTasaEditable()] = 0;
            realizarConversion();
            return;
          } else if (key === ',' || key === '.') {
            valorActualTasaCrudo = '0.';
          } else {
            valorActualTasaCrudo = key;
          }
          rateEditStarted = true;
        } else {
          if (key === 'backspace') {
            if (valorActualTasaCrudo.length > 1) {
              valorActualTasaCrudo = valorActualTasaCrudo.slice(0, -1);
            } else {
              valorActualTasaCrudo = '0';
              rateEditStarted = false;
            }
          } else if (key === ',' || key === '.') {
            if (!valorActualTasaCrudo.includes('.')) {
              valorActualTasaCrudo += '.';
            }
          } else {
            if (valorActualTasaCrudo.length < 8) {
              if (valorActualTasaCrudo === '0') {
                valorActualTasaCrudo = key;
              } else {
                valorActualTasaCrudo += key;
              }
            }
          }
        }

        rateCalcText.textContent = valorActualTasaCrudo.replace(/\./g, ',');
        let valorParseado = parseFloat(valorActualTasaCrudo);
        if (!isNaN(valorParseado) && valorParseado > 0) {
          rates[obtenerDivisaDeTasaEditable()] = valorParseado;
          realizarConversion();
        }
        return;
      }

      // LÓGICA DE ESCRITURA EN INPUTS
      if (key === 'check') {
        const valor = evaluarExpresionIncompleta(activeInput.value);
        if (!isNaN(valor) && valor > 0) {
          activeInput.value = formatearCantidad(valor, 2);
        } else {
          activeInput.value = '';
        }
        realizarConversion();
        clearOnNextKey = true;
        return;
      }

      if (key === 'C') {
        // Al presionar C, restablecer el monto del input origen activo a 1,00 y recalcular
        if (!isReversed) {
          inputForeign.value = formatearCantidad(1, 2);
        } else {
          inputVes.value = formatearCantidad(1, 2);
        }
        clearOnNextKey = true;
        realizarConversion();
        return;
      }

      let valorActual = activeInput.value;

      if (key === 'backspace') {
        if (valorActual.length > 0) {
          if (valorActual.endsWith(' ')) {
            if (/ [+\-] $/.test(valorActual)) {
              valorActual = valorActual.slice(0, -3);
            } else {
              valorActual = valorActual.slice(0, -1);
            }
          } else {
            valorActual = valorActual.slice(0, -1);
          }
          activeInput.value = valorActual;
        }
        realizarConversion();
        return;
      }

      if (['+', '-'].includes(key)) {
        clearOnNextKey = false;
        if (valorActual === '') {
          if (key === '-') {
            valorActual = '-';
          } else {
            valorActual = `0 ${key} `;
          }
        } else {
          if (/ [+\-] $/.test(valorActual)) {
            valorActual = valorActual.slice(0, -3) + ` ${key} `;
          } else if (valorActual === '-') {
            if (key !== '-') {
              valorActual = '';
            }
          } else {
            valorActual += ` ${key} `;
          }
        }
        activeInput.value = valorActual;
        realizarConversion();
        return;
      }

      // Sobrescribir en la primera pulsación numérica si corresponde
      if (clearOnNextKey) {
        if (key === ',' || key === '.') {
          valorActual = '0,';
        } else {
          valorActual = key;
        }
        clearOnNextKey = false;
        activeInput.value = valorActual;
        realizarConversion();
        return;
      }

      // Procesamiento de coma y dígitos normales
      if (key === ',' || key === '.') {
        const parts = valorActual.split(/[\+\-]/);
        const currentNumber = parts[parts.length - 1].trim();
        
        if (!currentNumber.includes(',')) {
          if (currentNumber === '' || parts[parts.length - 1] === '') {
            valorActual += '0,';
          } else {
            valorActual += ',';
          }
          activeInput.value = valorActual;
        }
      } else {
        const parts = valorActual.split(/[\+\-]/);
        const currentNumber = parts[parts.length - 1].trim();

        if (currentNumber === '0' && key === '0') {
          return;
        }

        if (currentNumber.includes(',')) {
          const decimalPart = currentNumber.split(',')[1];
          if (decimalPart && decimalPart.length >= 2) {
            return;
          }
        }

        if (currentNumber === '0') {
          const lastCharIdx = valorActual.lastIndexOf('0');
          if (lastCharIdx !== -1) {
            valorActual = valorActual.slice(0, lastCharIdx) + key;
          } else {
            valorActual = key;
          }
        } else {
          valorActual += key;
        }
        activeInput.value = valorActual;
      }

      realizarConversion();
    });

    const limpiarFeedback = () => btn.classList.remove('active-touch');
    btn.addEventListener('pointerup', limpiarFeedback);
    btn.addEventListener('pointerleave', limpiarFeedback);
    btn.addEventListener('pointercancel', limpiarFeedback);
  });

  // --- Inicializar Eventos de Copia y Compartido ---
  const copyForeignBtn = document.getElementById('copy-foreign-btn');
  const shareForeignBtn = document.getElementById('share-foreign-btn');
  const copyVesBtn = document.getElementById('copy-ves-btn');
  const shareVesBtn = document.getElementById('share-ves-btn');

  function copiarAlPortapapeles(texto, btn) {
    if (!texto) return;
    const valorEvaluado = evaluarExpresionIncompleta(texto);
    const textoACopiar = !isNaN(valorEvaluado) ? formatearCantidad(valorEvaluado, 2) : texto;

    navigator.clipboard.writeText(textoACopiar).then(() => {
      const svgOriginal = btn.innerHTML;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="#a3e635" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      vibrarTeclado();
      
      setTimeout(() => {
        btn.innerHTML = svgOriginal;
      }, 1500);
    }).catch(err => {
      console.error('Error al copiar:', err);
    });
  }

  function compartirConversion(texto) {
    if (!texto) return;
    if (navigator.share) {
      navigator.share({
        title: 'Conversión de Divisas',
        text: texto
      }).catch(err => {
        console.warn('Error al compartir:', err);
      });
    } else {
      navigator.clipboard.writeText(texto).then(() => {
        alert('Copiado al portapapeles (Compartir no soportado en este navegador)');
      });
    }
  }

  if (copyForeignBtn) {
    copyForeignBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copiarAlPortapapeles(inputForeign.value, copyForeignBtn);
    });
  }

  if (copyVesBtn) {
    copyVesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copiarAlPortapapeles(inputVes.value, copyVesBtn);
    });
  }

  if (shareForeignBtn || shareVesBtn) {
    const handleShare = (e) => {
      e.stopPropagation();
      const valForeignRaw = evaluarExpresionIncompleta(inputForeign.value);
      const valForeign = !isNaN(valForeignRaw) ? formatearCantidad(valForeignRaw, 2) : '0,00';
      
      const valVesRaw = evaluarExpresionIncompleta(inputVes.value);
      const valVes = !isNaN(valVesRaw) ? formatearCantidad(valVesRaw, 2) : '0,00';
      
      const divisaEditable = obtenerDivisaDeTasaEditable();
      const valTasa = rates[divisaEditable];
      const decimalesTasa = 2;
      const txt = `${valForeign} ${activeForeignCurrency} = ${valVes} ${activeVesCurrency} (Tasa: ${formatearCantidad(valTasa, decimalesTasa)})`;
      compartirConversion(txt);
    };
    
    if (shareForeignBtn) shareForeignBtn.addEventListener('click', handleShare);
    if (shareVesBtn) shareVesBtn.addEventListener('click', handleShare);
  }

  // Carga inicial rápida: 1 divisa extranjera seleccionada por defecto
  inputForeign.value = formatearCantidad(1, 2);
  realizarConversion();

  // --- Registro de PWA Service Worker ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registrado con éxito:', reg.scope))
        .catch(err => console.error('Error al registrar el Service Worker:', err));
    });

    // Recargar la página automáticamente cuando el nuevo Service Worker tome el control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }

  // --- Manejo de Instalación de PWA ---
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!sessionStorage.getItem('install_prompt_dismissed')) {
      mostrarAndroidPrompt();
    }
  });

  function mostrarAndroidPrompt() {
    if (androidPrompt) {
      androidPrompt.classList.remove('hidden');
      void androidPrompt.offsetWidth;
      androidPrompt.classList.add('show');
    }
  }

  function ocultarAndroidPrompt() {
    if (androidPrompt) {
      androidPrompt.classList.remove('show');
      setTimeout(() => {
        androidPrompt.classList.add('hidden');
      }, 500);
    }
  }

  if (btnTriggerInstall) {
    btnTriggerInstall.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      ocultarAndroidPrompt();
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Decisión de instalación del usuario: ${outcome}`);
      deferredPrompt = null;
    });
  }

  if (btnCancelInstall) {
    btnCancelInstall.addEventListener('click', () => {
      ocultarAndroidPrompt();
      sessionStorage.setItem('install_prompt_dismissed', 'true');
    });
  }

  window.addEventListener('appinstalled', (e) => {
    console.log('La aplicación fue instalada con éxito.');
    ocultarAndroidPrompt();
    deferredPrompt = null;
  });

  // iOS Safari (Flujo Educativo Personalizado)
  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };
  
  const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

  if (isIos() && !isInStandaloneMode() && iosSheet) {
    const yaRechazado = localStorage.getItem('ios_install_prompt_dismissed');
    if (!yaRechazado) {
      setTimeout(() => {
        iosSheet.classList.remove('hidden');
      }, 3000);
    }
  }

  if (closeIosSheet) {
    closeIosSheet.addEventListener('click', () => {
      if (iosSheet) {
        iosSheet.classList.add('hidden');
      }
      localStorage.setItem('ios_install_prompt_dismissed', 'true');
    });
  }
});
