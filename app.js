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

  // Nuevos Elementos del DOM Premium
  const connectionStatus = document.getElementById('connection-status');
  const connectionText = document.getElementById('connection-text');
  const btnSyncRates = document.getElementById('btn-sync-rates');

  const dashUsdVal = document.getElementById('dash-usd-val');
  const dashEurVal = document.getElementById('dash-eur-val');
  const dashUsdtVal = document.getElementById('dash-usdt-val');

  const formulaForeignCinta = document.getElementById('formula-foreign-cinta');
  const formulaVesCinta = document.getElementById('formula-ves-cinta');

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
    Custom: '$',
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

  // --- Notificación Visual (Toast) Premium ---
  function mostrarToast(mensaje) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-notification';
      toast.className = 'toast-notification';
      toast.innerHTML = `
        <span class="toast-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
        <span class="toast-text"></span>
      `;
      document.body.appendChild(toast);
    }
    toast.querySelector('.toast-text').textContent = mensaje;
    toast.classList.remove('show');
    void toast.offsetWidth; // Forzar reflow para reiniciar la animación CSS
    toast.classList.add('show');
    vibrarTeclado();

    // Auto-ocultar después de 2.5 segundos
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // --- Parser y Evaluación de Fórmulas Matemáticas ---
  function evaluarMatematicaSegura(s) {
    // Extraer tokens válidos: números enteros/decimales y operadores (+, -, *, /)
    const tokens = s.match(/([0-9]+(?:\.[0-9]+)?)|([\+\-\*\/])/g);
    if (!tokens) return NaN;

    // Primer paso: Resolver signos negativos unarios y consolidar tokens
    const processedTokens = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      // Si es un signo menos y está al inicio o sigue a otro operador, es unario negativo
      if (token === '-' && (i === 0 || ['+', '-', '*', '/'].includes(processedTokens[processedTokens.length - 1]))) {
        if (i + 1 < tokens.length && /^[0-9.]+$/.test(tokens[i + 1])) {
          processedTokens.push('-' + tokens[i + 1]);
          i++; // Saltamos el número ya consolidado con el signo
        } else {
          return NaN;
        }
      } else {
        processedTokens.push(token);
      }
    }

    // Segundo paso: Precedencia alta (Multiplicación y División)
    const valuesAfterMulDiv = [];
    let i = 0;
    while (i < processedTokens.length) {
      const token = processedTokens[i];
      if (token === '*' || token === '/') {
        const prevVal = parseFloat(valuesAfterMulDiv.pop());
        const nextToken = processedTokens[i + 1];
        if (nextToken === undefined) return NaN; // Operador al final incompleto
        const nextVal = parseFloat(nextToken);
        if (isNaN(prevVal) || isNaN(nextVal)) return NaN;

        let res;
        if (token === '*') {
          res = prevVal * nextVal;
        } else {
          if (nextVal === 0) return NaN; // División por cero
          res = prevVal / nextVal;
        }
        valuesAfterMulDiv.push(res);
        i += 2;
      } else {
        valuesAfterMulDiv.push(token);
        i++;
      }
    }

    // Tercer paso: Precedencia baja (Suma y Resta)
    if (valuesAfterMulDiv.length === 0) return NaN;
    let total = parseFloat(valuesAfterMulDiv[0]);
    if (isNaN(total)) return NaN;

    let j = 1;
    while (j < valuesAfterMulDiv.length) {
      const op = valuesAfterMulDiv[j];
      const valToken = valuesAfterMulDiv[j + 1];
      if (valToken === undefined) return NaN;
      const val = parseFloat(valToken);
      if (isNaN(val)) return NaN;

      if (op === '+') {
        total += val;
      } else if (op === '-') {
        total -= val;
      } else {
        return NaN; // Operador no reconocido en suma/resta
      }
      j += 2;
    }

    return isFinite(total) ? total : NaN;
  }

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

    // Validar caracteres permitidos
    if (!/^[0-9\+\-\*\/\.\s]+$/.test(s)) {
      return NaN;
    }

    return evaluarMatematicaSegura(s);
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

  // Envolver fetch con un timeout
  function fetchWithTimeout(url, options = {}, timeout = 4500) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de red')), timeout)
      )
    ]);
  }

  // Actualizar dashboard de tasas de referencia
  function actualizarDashboardTasas() {
    if (dashUsdVal) dashUsdVal.textContent = formatearCantidad(rates.USD, 2);
    if (dashEurVal) dashEurVal.textContent = formatearCantidad(rates.EUR, 2);
    if (dashUsdtVal) dashUsdtVal.textContent = formatearCantidad(rates.USDT, 2);

    // Resaltar la tarjeta del dashboard que coincide con la divisa origen activa
    const divisaOrigenActiva = !isReversed ? activeForeignCurrency : activeVesCurrency;
    
    document.querySelectorAll('.dashboard-card').forEach(card => {
      const ref = card.dataset.refCurrency;
      if (ref === divisaOrigenActiva) {
        card.classList.add('active-card');
      } else {
        card.classList.remove('active-card');
      }
    });
  }

  // Control online/offline de conectividad
  function actualizarEstadoRed() {
    if (!connectionStatus || !connectionText) return;
    if (navigator.onLine) {
      connectionStatus.className = 'connection-badge online';
      connectionText.textContent = 'Online';
      document.querySelectorAll('.card-indicator').forEach(ind => {
        ind.style.backgroundColor = '#10b981';
        ind.style.boxShadow = '0 0 6px #10b981';
      });
    } else {
      connectionStatus.className = 'connection-badge offline';
      connectionText.textContent = 'Offline';
      document.querySelectorAll('.card-indicator').forEach(ind => {
        ind.style.backgroundColor = '#ef4444';
        ind.style.boxShadow = '0 0 6px #ef4444';
      });
    }
  }

  // Animar los campos de entrada para que no cambien bruscamente
  function animarEntradaInputs() {
    if (!inputForeign || !inputVes) return;
    inputForeign.classList.remove('fade-slide-up');
    inputVes.classList.remove('fade-slide-up');
    void inputForeign.offsetWidth; // Forzar reflow para reiniciar la animación CSS
    inputForeign.classList.add('fade-slide-up');
    inputVes.classList.add('fade-slide-up');
  }

  // Actualizar la cinta superior del input con la fórmula en progreso
  function actualizarCintaFormula() {
    const inputActivo = activeInput;
    const cintaActiva = (inputActivo === inputForeign) ? formulaForeignCinta : formulaVesCinta;
    const cintaInactiva = (inputActivo === inputForeign) ? formulaVesCinta : formulaForeignCinta;

    if (cintaInactiva) cintaInactiva.textContent = '';
    if (!cintaActiva) return;

    const valor = inputActivo.value.trim();
    // Si contiene operadores matemáticos, mostrar la fórmula cruda
    if (/[\+\-×÷]/.test(valor)) {
      cintaActiva.textContent = valor;
    } else {
      cintaActiva.textContent = '';
    }
  }

  // Suscribirse a eventos de red
  window.addEventListener('online', actualizarEstadoRed);
  window.addEventListener('offline', actualizarEstadoRed);
  actualizarEstadoRed(); // Inicializar estado de red

  // Suscribirse a botón de sincronización manual
  if (btnSyncRates) {
    btnSyncRates.addEventListener('click', async () => {
      if (!navigator.onLine) {
        mostrarToast('Sin conexión a internet');
        return;
      }
      
      vibrarTeclado();
      btnSyncRates.classList.add('syncing');
      mostrarToast('Sincronizando tasas oficiales...');
      
      try {
        await consultarAPIs();
        mostrarToast('Tasas actualizadas con éxito');
      } catch (e) {
        console.warn('Fallo de sincronización manual:', e);
        mostrarToast('Error de red al actualizar tasas');
      } finally {
        setTimeout(() => {
          btnSyncRates.classList.remove('syncing');
        }, 800);
      }
    });
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

    // Si rates.Custom tiene su valor base por defecto (45.0), lo inicializamos con rates.USD
    if (rates.Custom === 45.0) {
      rates.Custom = rates.USD;
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
      const response = await fetchWithTimeout('https://ve.dolarapi.com/v1/dolares/oficial');
      if (response.ok) {
        const data = await response.json();
        const valorOficial = data ? (data.promedio || data.venta || data.compra) : null;
        if (valorOficial && typeof valorOficial === 'number' && valorOficial > 0) {
          officialRates.USD = valorOficial;
          updateTimes.USD = formatearFecha(data.fechaActualizacion);

          if (!isManualRate.USD) {
            rates.USD = valorOficial;
          }
        }
      }
    } catch (err) {
      console.warn('Error al obtener tasa USD BCV:', err);
    }

    // 2. Obtener EUR (BCV Oficial)
    try {
      const response = await fetchWithTimeout('https://ve.dolarapi.com/v1/euros/oficial');
      if (response.ok) {
        const data = await response.json();
        const valorOficial = data ? (data.promedio || data.venta || data.compra) : null;
        if (valorOficial && typeof valorOficial === 'number' && valorOficial > 0) {
          officialRates.EUR = valorOficial;
          updateTimes.EUR = formatearFecha(data.fechaActualizacion);

          if (!isManualRate.EUR) {
            rates.EUR = valorOficial;
          }
        }
      }
    } catch (err) {
      console.warn('Error al obtener tasa EUR BCV:', err);
    }

    // 3. Obtener USDT (Binance P2P)
    try {
      const response = await fetchWithTimeout('https://criptoya.com/api/binancep2p/USDT/VES/1');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          let valorOficial = 0;
          if (data.ask && data.bid) {
            valorOficial = (parseFloat(data.ask) + parseFloat(data.bid)) / 2;
          } else {
            valorOficial = parseFloat(data.ask || data.bid);
          }
          if (valorOficial && typeof valorOficial === 'number' && valorOficial > 0 && !isNaN(valorOficial)) {
            officialRates.USDT = valorOficial;
            updateTimes.USDT = formatearFecha(new Date().toISOString());

            if (!isManualRate.USDT) {
              rates.USDT = valorOficial;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error al obtener tasa USDT Binance:', err);
    }

    // Si rates.Custom tiene su valor base por defecto (45.0), lo inicializamos con rates.USD
    if (rates.Custom === 45.0) {
      rates.Custom = rates.USD;
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

    // Sincronizar el Dashboard de Tasas
    actualizarDashboardTasas();

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

  // --- Lógica de Escalado Dinámico de Fuente para Inputs ---
  function ajustarTamanoFuente(input) {
    if (!input) return;
    const wrapper = input.closest('.input-wrapper');
    if (!wrapper) return;

    const len = input.value.length;

    // Escalado de fuente agresivo y armonioso para que quepa en cualquier ancho de pantalla móvil
    if (len >= 16) {
      wrapper.style.fontSize = '1.05rem';
    } else if (len >= 13) {
      wrapper.style.fontSize = '1.25rem';
    } else if (len >= 10) {
      wrapper.style.fontSize = '1.5rem';
    } else if (len >= 8) {
      wrapper.style.fontSize = '1.8rem';
    } else {
      wrapper.style.fontSize = '2.25rem';
    }
  }

  function ajustarTamanoFuenteTodos() {
    ajustarTamanoFuente(inputForeign);
    ajustarTamanoFuente(inputVes);
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
        ajustarTamanoFuenteTodos();
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
        ajustarTamanoFuenteTodos();
        return;
      }

      const resultado = valorDestino * (tasaDestino / tasaOrigen);
      if (document.activeElement !== inputForeign) {
        inputForeign.value = formatearCantidad(resultado, 2);
      }
    }
    ajustarTamanoFuenteTodos();
  }

  function recalcularConversiones() {
    realizarConversion();
  }

  // Escuchar cambios nativos por si acaso
  inputForeign.addEventListener('input', () => {
    realizarConversion();
    actualizarCintaFormula();
  });

  inputVes.addEventListener('input', () => {
    realizarConversion();
    actualizarCintaFormula();
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
    actualizarCintaFormula();
  });

  inputVes.addEventListener('blur', () => {
    const valor = evaluarExpresionIncompleta(inputVes.value);
    if (!isNaN(valor) && valor > 0) {
      inputVes.value = formatearCantidad(valor, 2);
    } else {
      inputVes.value = '';
    }
    realizarConversion();
    actualizarCintaFormula();
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

      animarEntradaInputs();
      actualizarDisplayTasa();
      realizarConversion();
      actualizarCintaFormula();
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
        actualizarCintaFormula();
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
        actualizarCintaFormula();
        return;
      }

      let valorActual = activeInput.value;

      if (key === 'backspace') {
        if (valorActual.length > 0) {
          if (valorActual.endsWith(' ')) {
            if (/ [+\-×÷] $/.test(valorActual)) {
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
        actualizarCintaFormula();
        return;
      }

      const opVisuals = {
        '+': '+',
        '-': '-',
        '*': '×',
        '/': '÷'
      };

      if (['+', '-', '*', '/'].includes(key)) {
        clearOnNextKey = false;
        const visualOp = opVisuals[key];
        if (valorActual === '') {
          if (key === '-') {
            valorActual = '-';
          } else {
            valorActual = `0 ${visualOp} `;
          }
        } else {
          if (/ [+\-×÷] $/.test(valorActual)) {
            valorActual = valorActual.slice(0, -3) + ` ${visualOp} `;
          } else if (valorActual === '-') {
            if (visualOp !== '-') {
              valorActual = '';
            }
          } else {
            valorActual += ` ${visualOp} `;
          }
        }
        activeInput.value = valorActual;
        realizarConversion();
        actualizarCintaFormula();
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
        actualizarCintaFormula();
        return;
      }

      // Procesamiento de coma y dígitos normales
      if (key === ',' || key === '.') {
        const parts = valorActual.split(/[\+\-×÷]/);
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
        const parts = valorActual.split(/[\+\-×÷]/);
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
      actualizarCintaFormula();
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

  function generarComprobantePNG(valForeign, codForeign, valVes, codVes, tasaTexto, tasaUpdate) {
    return new Promise((resolve, reject) => {
      const dibujarComprobante = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');

        // Dibujar fondo degradado premium oscuro
        const grad = ctx.createLinearGradient(0, 0, 0, 800);
        grad.addColorStop(0, '#07080c');
        grad.addColorStop(1, '#010102');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 800, 800);

        // Obtener color de acento según la divisa origen activa
        const divisaOrigenActiva = !isReversed ? activeForeignCurrency : activeVesCurrency;
        const accentHex = {
          USD: '#22c55e',
          EUR: '#3b82f6',
          USDT: '#00b4d8',
          VES: '#a3e635',
          Custom: '#facc15'
        }[divisaOrigenActiva] || '#22c55e';

        const accentRGB = {
          USD: '34, 197, 94',
          EUR: '59, 130, 246',
          USDT: '0, 180, 216',
          VES: '163, 230, 53',
          Custom: '250, 204, 21'
        }[divisaOrigenActiva] || '34, 197, 94';

        // Glows ambientales de neón sutiles en las esquinas
        const glowRad1 = ctx.createRadialGradient(100, 100, 10, 100, 100, 300);
        glowRad1.addColorStop(0, `rgba(${accentRGB}, 0.09)`);
        glowRad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowRad1;
        ctx.beginPath();
        ctx.arc(100, 100, 300, 0, Math.PI * 2);
        ctx.fill();

        const glowRad2 = ctx.createRadialGradient(700, 700, 10, 700, 700, 300);
        glowRad2.addColorStop(0, `rgba(${accentRGB}, 0.09)`);
        glowRad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowRad2;
        ctx.beginPath();
        ctx.arc(700, 700, 300, 0, Math.PI * 2);
        ctx.fill();

        // Cuadrícula tecnológica muy tenue de fondo
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 800; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 800);
          ctx.stroke();
        }
        for (let y = 0; y < 800; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(800, y);
          ctx.stroke();
        }

        const cardX = 60;
        const cardY = 60;
        const cardW = 680;
        const cardH = 680;
        const cardR = 24;

        // Dibujar tarjeta interior con sombra realista y profunda
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 45;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 22;

        ctx.fillStyle = 'rgba(15, 17, 26, 0.75)';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
        ctx.fill();

        // Desactivar sombra para evitar ralentizaciones o efectos no deseados
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Borde glassmorphic brillante (reflectante) de la tarjeta
        const strokeGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
        strokeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
        strokeGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.02)');
        strokeGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.01)');
        strokeGrad.addColorStop(1, `rgba(${accentRGB}, 0.28)`);
        ctx.strokeStyle = strokeGrad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Borde decorativo superior neon
        ctx.fillStyle = accentHex;
        ctx.beginPath();
        ctx.roundRect(cardX + 40, cardY, cardW - 80, 4, 2);
        ctx.fill();

        // Logotipo de la app en la cabecera
        const logoX = cardX + 50;
        const logoY = cardY + 65;
        ctx.fillStyle = `rgba(${accentRGB}, 0.12)`;
        ctx.beginPath();
        ctx.arc(logoX, logoY, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = accentHex;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dibujar flechas del logo
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Flecha superior
        ctx.beginPath();
        ctx.moveTo(logoX - 8, logoY - 4);
        ctx.lineTo(logoX + 8, logoY - 4);
        ctx.lineTo(logoX + 4, logoY - 8);
        ctx.stroke();

        // Flecha inferior
        ctx.beginPath();
        ctx.moveTo(logoX + 8, logoY + 4);
        ctx.lineTo(logoX - 8, logoY + 4);
        ctx.lineTo(logoX - 4, logoY + 8);
        ctx.stroke();

        // Textos de cabecera
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px "Outfit", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('CALCULATOR VES', logoX + 35, logoY - 2);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('COMPROBANTE DE CONVERSIÓN', logoX + 35, logoY + 16);

        // Obtener fecha y hora del cálculo en tiempo real (formateado premium)
        const ahora = new Date();
        const opciones = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        const fechaStr = ahora.toLocaleDateString('es-VE', opciones);

        // Caja de Fecha de Emisión (esquina superior derecha) - Premium y Minimalista
        const dateBoxW = 210;
        const dateBoxH = 34;
        const dateBoxX = cardX + cardW - dateBoxW - 50;
        const dateBoxY = logoY - 14;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(dateBoxX, dateBoxY, dateBoxW, dateBoxH, 10);
        ctx.fill();
        ctx.stroke();

        // Imprimir fecha centrada en la caja
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(fechaStr, dateBoxX + dateBoxW / 2, dateBoxY + 21);

        // Caja 1: Monto Origen
        const boxX = cardX + 50;
        const boxW = cardW - 100;
        const box1Y = cardY + 140;
        const boxH = 100;

        // Sombra suave para la Caja 1
        ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 6;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.022)';
        ctx.beginPath();
        ctx.roundRect(boxX, box1Y, boxW, boxH, 16);
        ctx.fill();

        // Desactivar sombra
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('MONTO ORIGINAL', boxX + 24, box1Y + 34);

        const symbolOrig = currencySymbols[codForeign] || '';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px "Outfit", sans-serif';
        ctx.fillText(`${symbolOrig} ${valForeign}`, boxX + 24, box1Y + 72);

        // Círculo central con flecha hacia abajo
        const arrowY = box1Y + boxH + 30;
        ctx.fillStyle = `rgba(${accentRGB}, 0.12)`;
        ctx.beginPath();
        ctx.arc(400, arrowY, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = accentHex;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.strokeStyle = accentHex;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(400, arrowY - 6);
        ctx.lineTo(400, arrowY + 6);
        ctx.moveTo(395, arrowY + 1);
        ctx.lineTo(400, arrowY + 6);
        ctx.lineTo(405, arrowY + 1);
        ctx.stroke();

        // Caja 2: Monto Destino
        const box2Y = arrowY + 30;

        // Sombra suave para la Caja 2
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 8;

        ctx.fillStyle = `rgba(${accentRGB}, 0.06)`;
        ctx.beginPath();
        ctx.roundRect(boxX, box2Y, boxW, boxH, 16);
        ctx.fill();

        // Desactivar sombra
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Borde acentuado de la Caja 2
        ctx.strokeStyle = `rgba(${accentRGB}, 0.24)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = accentHex;
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('VALOR CONVERTIDO', boxX + 24, box2Y + 34);

        const symbolDest = currencySymbols[codVes] || '';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.fillText(`${symbolDest} ${valVes}`, boxX + 24, box2Y + 72);

        // Caja 3: Información Tasa y Referencia
        const infoY = box2Y + boxH + 30;
        const infoH = 95;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(boxX, infoY, boxW, infoH, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('TASA DE CAMBIO APLICADA:', boxX + 20, infoY + 30);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px "Outfit", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(tasaTexto, boxX + boxW - 20, infoY + 30);

        ctx.fillStyle = '#64748b';
        ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('FUENTES / ACTUALIZACIÓN:', boxX + 20, infoY + 65);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(tasaUpdate, boxX + boxW - 20, infoY + 65);

        // Footer del comprobante
        const footerY = cardY + cardH - 35;
        ctx.fillStyle = '#64748b';
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CALCULADO DE FORMA SEGURA CON CALCULATOR VES', 400, footerY);

        ctx.fillStyle = 'rgba(163, 230, 53, 0.6)';
        ctx.font = 'bold 11px "Outfit", sans-serif';
        ctx.fillText('calculator-ves.onrender.com', 400, footerY + 16);



        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob falló'));
          }
        }, 'image/png');
      };

      if (document.fonts) {
        document.fonts.ready.then(() => {
          dibujarComprobante();
        }).catch((err) => {
          console.warn('Fallo al cargar fuentes para Canvas, usando fuentes locales:', err);
          dibujarComprobante();
        });
      } else {
        dibujarComprobante();
      }
    });
  }

  function compartirComprobante(valForeign, codForeign, valVes, codVes, tasaTexto, tasaUpdate) {
    generarComprobantePNG(valForeign, codForeign, valVes, codVes, tasaTexto, tasaUpdate)
      .then((blob) => {
        const file = new File([blob], 'comprobante-conversion.png', { type: 'image/png' });

        const displayCodForeign = codForeign === 'Custom' ? 'USD' : codForeign;
        const displayCodVes = codVes === 'Custom' ? 'USD' : codVes;

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: 'Comprobante de Conversión',
            text: `Conversión: ${valForeign} ${displayCodForeign} = ${valVes} ${displayCodVes}`
          })
            .then(() => mostrarToast('¡Comprobante compartido!'))
            .catch(err => {
              if (err.name !== 'AbortError') {
                console.warn('Error al compartir comprobante:', err);
                copiarImagenAlPortapapeles(blob);
              }
            });
        } else {
          copiarImagenAlPortapapeles(blob);
        }
      })
      .catch((err) => {
        console.error('Error al generar la imagen del comprobante:', err);
        const displayCodForeign = codForeign === 'Custom' ? 'USD' : codForeign;
        const displayCodVes = codVes === 'Custom' ? 'USD' : codVes;
        // Respaldo de texto plano original en caso de fallo catastrófico del Canvas
        const txt = `${valForeign} ${displayCodForeign} = ${valVes} ${displayCodVes} (${tasaTexto})`;
        if (navigator.share) {
          navigator.share({
            title: 'Conversión de Divisas',
            text: txt
          }).catch(err => console.warn(err));
        } else {
          navigator.clipboard.writeText(txt).then(() => {
            mostrarToast('¡Conversión copiada al portapapeles!');
          });
        }
      });
  }

  function copiarImagenAlPortapapeles(blob) {
    if (navigator.clipboard && navigator.clipboard.write) {
      const item = new ClipboardItem({ "image/png": blob });
      navigator.clipboard.write([item]).then(() => {
        mostrarToast('¡Imagen del comprobante copiada al portapapeles!');
      }).catch(err => {
        console.warn('Error al copiar imagen al portapapeles:', err);
        descargarComprobante(blob);
      });
    } else {
      descargarComprobante(blob);
    }
  }

  function descargarComprobante(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprobante-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarToast('Descargando imagen del comprobante...');
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

      const tOrigen = obtenerTasaEnVes(activeForeignCurrency);
      const tDestino = obtenerTasaEnVes(activeVesCurrency);
      const tasaEquiv = tDestino > 0 ? (tOrigen / tDestino) : 0;

      const simbOrigen = currencySymbols[activeForeignCurrency] || '';
      const simbDestino = currencySymbols[activeVesCurrency] || '';
      const tasaTexto = `${simbOrigen}1 = ${simbDestino}${formatearCantidad(tasaEquiv, 2)}`;

      let tasaUpdate = 'Actualizado recientemente';
      if (divisaEditable === 'Custom') {
        tasaUpdate = 'Tasa personalizada del usuario';
      } else {
        tasaUpdate = updateTimes[divisaEditable] || 'Actualizado recientemente';
      }
      // Reemplazar la palabra "Actualizado" del texto si existe para que quede más limpio
      tasaUpdate = tasaUpdate.replace('Actualizado ', '');

      compartirComprobante(valForeign, activeForeignCurrency, valVes, activeVesCurrency, tasaTexto, tasaUpdate);
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
