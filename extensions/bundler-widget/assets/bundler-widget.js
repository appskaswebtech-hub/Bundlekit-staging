/**
 * Bundler – Quantity Breaks Widget (Debug version)
 */
(function () {
  'use strict';

  console.log('[Bundler] Widget script loaded');

  /* ─── Helpers ──────────────────────────────── */

  function formatMoney(amount, symbol) {
    return symbol + parseFloat(amount).toFixed(2);
  }

  function calcPrice(basePrice, qty, discountType, discountValue) {
    var total = basePrice * qty;
    if (!discountValue || discountValue === 0) {
      return { final: total, original: null };
    }
    var final = total;
    if (discountType === 'PERCENTAGE') {
      final = total * (1 - discountValue / 100);
    } else if (discountType === 'FIXED_AMOUNT') {
      final = total - discountValue;
    } else if (discountType === 'FIXED_PRICE') {
      final = discountValue * qty;
    }
    return { final: Math.max(0, final), original: total };
  }

  function template(str, qb) {
    if (!str) return '';
    return str
      .replace(/\{\{discount_value\}\}/g, qb.discountValue)
      .replace(/\{\{discount_unit\}\}/g, qb.discountType === 'PERCENTAGE' ? '%' : '$')
      .replace(/\{\{quantity\}\}/g, qb.quantity)
      .replace(/\{\{max_quantity\}\}/g, qb.maxQuantity || '');
  }

  /* ─── Render one widget instance ───────────── */

  function renderWidget(root, bundle, basePrice, currencySymbol) {
    console.log('[Bundler] Rendering widget for bundle:', bundle.title, 'basePrice:', basePrice);

    var breaks = bundle.quantityBreaks;
    if (!breaks || breaks.length === 0) {
      console.warn('[Bundler] No quantity breaks found');
      root.classList.add('bdlrkit-bundler-qb--hidden');
      return;
    }

    console.log('[Bundler] Quantity breaks:', breaks.length);

    // Build HTML
    var html = '<div class="bdlrkit-bundler-qb__title">' + bundle.title + '</div>';
    html += '<div class="bdlrkit-bundler-qb__options">';

    breaks.forEach(function (qb, idx) {
      var prices  = calcPrice(basePrice, qb.quantity, qb.discountType, qb.discountValue);
      var savings = qb.discountValue > 0 ? template(qb.savingsText, qb) : '';
      var desc    = template(qb.description, qb);
      var sel     = idx === 0 ? ' bdlrkit-bundler-qb__option--selected' : '';

      html += '<div class="bdlrkit-bundler-qb__option' + sel + '"'
            + ' data-index="' + idx + '"'
            + ' data-qty="' + qb.quantity + '"'
            + ' data-break-id="' + qb.id + '"'
            + ' data-bundle-id="' + bundle.id + '"'
            + ' role="radio"'
            + ' aria-checked="' + (idx === 0 ? 'true' : 'false') + '"'
            + ' tabindex="0">'
            + '  <span class="bdlrkit-bundler-qb__radio"><span class="bdlrkit-bundler-qb__radio-inner"></span></span>'
            + '  <span class="bdlrkit-bundler-qb__label">' + desc + '</span>'
            + '  <span class="bdlrkit-bundler-qb__prices">';

      if (savings) {
        html += '<span class="bdlrkit-bundler-qb__badge">' + savings + '</span>';
      }
      html += '<span class="bdlrkit-bundler-qb__price">' + formatMoney(prices.final, currencySymbol) + '</span>';
      if (prices.original) {
        html += '<span class="bdlrkit-bundler-qb__original">' + formatMoney(prices.original, currencySymbol) + '</span>';
      }
      html += '  </span></div>';
    });

    html += '</div>';
    
    root.innerHTML = html;
    root.classList.add('bdlrkit-bundler-qb--loaded');

    // ── Interaction ──
    var options = root.querySelectorAll('.bdlrkit-bundler-qb__option');
    var selectedQty = breaks[0]?.quantity || 1;
    var selectedBreakId = breaks[0]?.id || '';
    var selectedBundleId = bundle.id || '';
    console.log('[Bundler] Initial selectedQty:', selectedQty);

    function selectOption(el) {
      // Deselect all
      options.forEach(function (o) {
        o.classList.remove('bdlrkit-bundler-qb__option--selected');
        o.setAttribute('aria-checked', 'false');
      });
      el.classList.add('bdlrkit-bundler-qb__option--selected');
      el.setAttribute('aria-checked', 'true');

      selectedQty = parseInt(el.dataset.qty, 10);
      selectedBreakId = el.dataset.breakId || '';
      selectedBundleId = el.dataset.bundleId || '';
      console.log('[Bundler] Option selected → qty:', selectedQty, 'breakId:', selectedBreakId, 'bundleId:', selectedBundleId);

      // Update ALL quantity inputs on the page
      var qtyInputs = document.querySelectorAll('input[name="quantity"]');
      console.log('[Bundler] Found quantity inputs:', qtyInputs.length);

      qtyInputs.forEach(function (qtyInput, i) {
        console.log('[Bundler] Updating input #' + i, 'from', qtyInput.value, 'to', selectedQty);
        qtyInput.value = selectedQty;
        qtyInput.setAttribute('value', selectedQty);
        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
        qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      if (qtyInputs.length === 0) {
        console.warn('[Bundler] ⚠️ No quantity inputs found on page!');
      }
    }

    // Helper: add bundler properties to a cart body object
    // Different properties = Shopify creates SEPARATE cart lines
    function injectBundlerProperties(body) {
      var props = {
        '_bundler_break_id': selectedBreakId,
        '_bundler_bundle_id': selectedBundleId,
        '_bundler_qty': String(selectedQty)
      };

      // Single item format: { id, quantity, properties }
      if (body.id || body.quantity !== undefined) {
        body.quantity = selectedQty;
        if (!body.properties) body.properties = {};
        Object.assign(body.properties, props);
        console.log('[Bundler] Injected properties into single item:', JSON.stringify(props));
      }

      // Multi-item format: { items: [{ id, quantity, properties }] }
      if (Array.isArray(body.items)) {
        body.items.forEach(function (item) {
          item.quantity = selectedQty;
          if (!item.properties) item.properties = {};
          Object.assign(item.properties, props);
        });
        console.log('[Bundler] Injected properties into items array');
      }

      return body;
    }

    // Intercept form submit to force correct quantity + add hidden fields
    var forms = document.querySelectorAll(
      'form[action*="/cart/add"], form.product-form, .product-form form, product-form form'
    );
    console.log('[Bundler] Found forms to intercept:', forms.length);

    forms.forEach(function (form, i) {
      console.log('[Bundler] Intercepting form #' + i, form.action || form.className);
      form.addEventListener('submit', function (e) {
        console.log('[Bundler] Form submit intercepted! qty:', selectedQty, 'breakId:', selectedBreakId);
        var qtyInput = form.querySelector('input[name="quantity"]');
        if (qtyInput) {
          qtyInput.value = selectedQty;
        }
        // Add hidden property fields for separate cart lines
        ensureHidden(form, 'properties[_bundler_break_id]', selectedBreakId);
        ensureHidden(form, 'properties[_bundler_bundle_id]', selectedBundleId);
        ensureHidden(form, 'properties[_bundler_qty]', String(selectedQty));
      }, true);
    });

    function ensureHidden(form, name, value) {
      var input = form.querySelector('input[name="' + name + '"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        form.appendChild(input);
      }
      input.value = value;
    }

    // Intercept fetch calls to /cart/add.js — override qty + inject properties
    var originalFetch = window.fetch;
    window.fetch = function (url, opts) {
      if (typeof url === 'string' && url.includes('/cart/add')) {
        console.log('[Bundler] 🔥 Fetch intercepted:', url);
        console.log('[Bundler] Current selectedQty:', selectedQty, 'breakId:', selectedBreakId);
        try {
          if (opts && opts.body) {
            if (typeof opts.body === 'string') {
              var body = JSON.parse(opts.body);
              console.log('[Bundler] Original fetch body:', JSON.stringify(body));
              body = injectBundlerProperties(body);
              opts.body = JSON.stringify(body);
              console.log('[Bundler] Modified fetch body:', opts.body);
            } else if (opts.body instanceof FormData) {
              console.log('[Bundler] FormData body, setting quantity + properties');
              opts.body.set('quantity', selectedQty);
              opts.body.set('properties[_bundler_break_id]', selectedBreakId);
              opts.body.set('properties[_bundler_bundle_id]', selectedBundleId);
              opts.body.set('properties[_bundler_qty]', String(selectedQty));
            }
          }
        } catch (e) {
          console.error('[Bundler] Fetch intercept error:', e);
        }
      }
      return originalFetch.call(this, url, opts);
    };

    // Also intercept XMLHttpRequest for older themes
    var originalXHRSend = XMLHttpRequest.prototype.send;
    var originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      this._bundlerUrl = url;
      return originalXHROpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
      if (this._bundlerUrl && this._bundlerUrl.includes('/cart/add') && body) {
        console.log('[Bundler] 🔥 XHR intercepted:', this._bundlerUrl);
        try {
          if (typeof body === 'string') {
            var parsed = JSON.parse(body);
            console.log('[Bundler] Original XHR body:', JSON.stringify(parsed));
            parsed = injectBundlerProperties(parsed);
            body = JSON.stringify(parsed);
            console.log('[Bundler] Modified XHR body:', body);
          }
        } catch (e) {
          console.error('[Bundler] XHR intercept error:', e);
        }
      }
      return originalXHRSend.call(this, body);
    };

    // Click handler
    options.forEach(function (opt) {
      opt.addEventListener('click', function () {
        selectOption(this);
      });
      opt.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectOption(this);
        }
      });
    });

    // Auto-select first option
    if (options.length > 0) {
      selectOption(options[0]);
    }

    console.log('[Bundler] ✅ Widget rendered successfully');
  }

  /* ─── Fetch & Init ─────────────────────────── */

  function initWidget(root) {
    var productId    = root.dataset.productId;
    var rawPrice     = root.dataset.productPrice;
    var currency     = root.dataset.currencySymbol || '$';
    var shop         = root.dataset.shop;
    var proxyPath    = root.dataset.proxyPath || '/apps/bundler';
    var widgetType = root.dataset.widgetType || 'bundler-widget';

    console.log('[Bundler] Init widget:', { productId: productId, rawPrice: rawPrice, shop: shop, proxyPath: proxyPath });

    var basePrice = parseFloat(rawPrice);
    if (isNaN(basePrice) || basePrice <= 0) {
      basePrice = parseFloat(rawPrice) / 100;
    }
    if (isNaN(basePrice) || basePrice <= 0) {
      console.error('[Bundler] Invalid base price:', rawPrice);
      root.classList.add('bdlrkit-bundler-qb--hidden');
      return;
    }

    console.log('[Bundler] Base price:', basePrice);

    var url = proxyPath + '/api/widget-data'
            + '?shop=' + encodeURIComponent(shop)
            + '&productId=' + encodeURIComponent(productId)
            + '&widgetType=' + encodeURIComponent(widgetType);

    console.log('[Bundler] Fetching:', url);

    fetch(url)
      .then(function (res) {
        console.log('[Bundler] API response status:', res.status);
        return res.json();
      })
      .then(function (data) {
        console.log('[Bundler] API data:', JSON.stringify(data).substring(0, 200));
        // ✅ Yeh add karo
    if (data.colors) {
      applyColors(root, data.colors);
    }
        // if (data.bundles && data.bundles.length > 0) {
        //   renderWidget(root, data.bundles[1], basePrice, currency);
        // } 
  if (data.bundles && data.bundles.length > 0) {
  var matchedBundle = data.bundles.find(function(b) {
    return b.name === "Quantity breaks";
  });
  var bundle = matchedBundle;
  renderWidget(root, bundle, basePrice, currency);
}else {
          console.warn('[Bundler] No bundles found for this product');
          root.classList.add('bdlrkit-bundler-qb--hidden');
        }
      })
      .catch(function (err) {
        console.error('[Bundler] Widget load error:', err);
        root.classList.add('bdlrkit-bundler-qb--hidden');
      });
  }

  /* ─── Boot ─────────────────────────────────── */

  function boot() {
    var roots = document.querySelectorAll('.bdlrkit-bundler-qb');
    console.log('[Bundler] Boot — found widget roots:', roots.length);
    // console.log('[Bundler] Boot — found widget roots:', roots);
    roots.forEach(function (root) {
      if (root.dataset.bundlerInit) return;
      root.dataset.bundlerInit = 'true';
      initWidget(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', boot);
  document.addEventListener('shopify:block:select', boot);

})();


// Price update function for widgets Start

var bundlerDataCache = null;

// ── Step 1 — Fetching bundle data from API─────
function fetchBundlerData() {
  var root = document.querySelector('.bdlrkit-bundler-qb');
  if (!root) return Promise.resolve(null);

  var shop      = root.dataset.shop;
  var productId = root.dataset.productId;
  var proxyPath = root.dataset.proxyPath || '/apps/bundler';

  if (bundlerDataCache) return Promise.resolve(bundlerDataCache);

  return fetch(
    proxyPath + '/api/widget-data' +
    '?shop='      + encodeURIComponent(shop) +
    '&productId=' + encodeURIComponent(productId)
  )
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.bundles && data.bundles.length > 0) {
        bundlerDataCache = data.bundles[0];
        return bundlerDataCache;
      }
      return null;
    })
    .catch(function (err) {
      console.error('[Bundler] fetchBundlerData error:', err);
      return null;
    });
}

// ── Step 2 — Getting latest price from Variant JSON ─


function getSelectedVariantPrice() {

  // ── Step 1: Get current variant ID (multi-selector fallback) ──
  var variantIdEl = document.querySelector([
    'input.product-variant-id',
    'input[name="id"]',
    'select[name="id"]',
    'input[name="variant"]'
  ].join(','));

  if (!variantIdEl) {
    console.warn('[Bundler] Variant ID input not found');
    return null;
  }

  var currentVariantId = parseInt(variantIdEl.value || variantIdEl.getAttribute('value'));
  console.log('[Bundler] Current Variant ID:', currentVariantId);

  // ── Step 2: Try all known ways themes expose variant data ──

  var variants = [];

  // Strategy A: Individual <script type="application/json"> tags (your current fix)
  document.querySelectorAll('script[type="application/json"]').forEach(function (script) {
    try {
      var parsed = JSON.parse(script.textContent);
      if (parsed && parsed.id !== undefined && parsed.price !== undefined) {
        variants.push(parsed); // individual variant objects
      } else if (Array.isArray(parsed) && parsed[0]?.price !== undefined) {
        variants = variants.concat(parsed); // array of variants
      }
    } catch (e) {}
  });

  // Strategy B: window.ShopifyAnalytics (available on most themes)
  if (variants.length === 0) {
    try {
      var sa = window.ShopifyAnalytics?.meta?.selectedVariantId;
      var product = window.ShopifyAnalytics?.meta?.product;
      if (product?.variants) {
        variants = product.variants;
      }
    } catch (e) {}
  }

  // Strategy C: Common global variables set by themes
  if (variants.length === 0) {
    var globals = ['productVariants', 'variants', 'theme.variants'];
    globals.forEach(function (key) {
      try {
        var val = window[key];
        if (Array.isArray(val) && val[0]?.price !== undefined) {
          variants = val;
        }
      } catch (e) {}
    });
  }

  // Strategy D: Fetch from Shopify's AJAX API as last resort
  if (variants.length === 0) {
    console.warn('[Bundler] Falling back to AJAX API — async!');
    return fetch(window.location.pathname + '.js')
      .then(res => res.json())
      .then(product => {
        var matched = product.variants.find(v => v.id === currentVariantId);
        return matched ? matched.price / 100 : null;
      });
  }

  // ── Step 3: Match variant ──
  var matched = variants.find(function (v) { return v.id === currentVariantId; });

  if (!matched) {
    console.warn('[Bundler] No variant matched for ID:', currentVariantId);
    return null;
  }

  console.log('[Bundler] Matched variant:', matched.title, '→ $' + (matched.price / 100).toFixed(2));
  return matched.price / 100;
}


// ── Step 3 — Discount calculation ──────────────
function calcDiscountedPrice(basePrice, qty, discountType, discountValue) {
  var total = basePrice * qty;

  if (!discountValue || discountValue === 0) {
    return { final: total, original: null };
  }

  var final;
  if (discountType === 'PERCENTAGE') {
    final = total * (1 - discountValue / 100);      // 10% off
  } else if (discountType === 'FIXED_AMOUNT') {
    final = total - discountValue;                   // $5 off total
  } else if (discountType === 'FIXED_PRICE') {
    final = discountValue * qty;                     // $100 per item
  } else {
    final = total;
  }

  return { final: Math.max(0, final), original: total };
}

// ── Step 4 — updating Widget prices ─────────
function updateBundlerPrices() {
 
  var bundlerOptions = document.querySelectorAll('.bdlrkit-bundler-qb__option');
  if (bundlerOptions.length === 0) {
    console.log('[Bundler] No widget options found');
    return;
  }

  // get Latest variant 
  var basePrice = getSelectedVariantPrice();
  
  if (!basePrice || isNaN(basePrice)) {
    console.error('[Bundler] Invalid base price — aborting update',basePrice);
    return;
  }

  // fetch Bundle data
  fetchBundlerData().then(function (bundle) {
    if (!bundle) {
      console.warn('[Bundler] No bundle data available');
      return;
    }

    bundlerOptions.forEach(function (option) {
      var idx = parseInt(option.getAttribute('data-index'), 10);
      var qb  = bundle.quantityBreaks[idx];

      if (!qb) {
        console.warn('[Bundler] No quantity break for index:', idx);
        return;
      }

      console.log('[Bundler] Updating option', idx,
        '| qty:', qb.quantity,
        '| type:', qb.discountType,
        '| value:', qb.discountValue
      );

      var prices = calcDiscountedPrice(basePrice, qb.quantity, qb.discountType, qb.discountValue);

      // Original (strikethrough) price
      option.querySelectorAll('.bdlrkit-bundler-qb__original').forEach(function (el) {
        if (prices.original) {
          el.innerText      = '$' + prices.original.toFixed(2);
          el.style.display  = '';
        } else {
          el.style.display  = 'none';
        }
      });

      // Final discounted price
      var finalEl = option.querySelector('.bdlrkit-bundler-qb__price');
      if (finalEl) {
        finalEl.innerText = '$' + prices.final.toFixed(2);
      }
    });
  });
}

 // List of ALL known selectors across popular Shopify themes
function getVariantIdElement() {
 
  var selectors = [
    'input.product-variant-id',              // Debut, Simple
    'input[name="id"]',                      // Dawn, Horizon, Refresh
    'select[name="id"]',                     // Some older themes (dropdown)
    'input[name="variant"]',                 // Some custom themes
    'input[name="variant_id"]',              // Some third-party themes
    'form[action*="/cart/add"] input[name="id"]',   // More specific Dawn
    'form.product-form input[name="id"]',    // Craft, Sense
    'form[data-product-form] input[name="id"]', // Impulse, Turbo
    '[data-product-select]',                 // Some themes use data attributes
    '#product-select',                       // Very old themes
  ];

  for (var i = 0; i < selectors.length; i++) {
    var el = document.querySelector(selectors[i]);
    if (el) {
      console.log('[Bundler] Variant ID element found with selector:', selectors[i]);
      return el;
    }
  }

  return null; // nothing found
}

// ── Step 5 —watching  Variant ID change──────
function watchVariantChange() {
  var variantIdEl = getVariantIdElement();
  if (!variantIdEl) {
    console.warn('[Bundler] Cannot watch — variant input not found');
    return;
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.attributeName === 'value') {
        var newId = variantIdEl.getAttribute('value');
        console.log('[Bundler] ✅ Variant ID changed to:', newId);
        bundlerDataCache = null;      // cache clear karo
        updateBundlerPrices();        // turant update karo — no delay needed
      }
    });
  });

  observer.observe(variantIdEl, { attributes: true });
  console.log('[Bundler] 👀 Watching variant ID changes');
}

// ── Step 6 — Radio change listener (backup) ────
document.querySelectorAll('.product-form__input input[type="radio"] ').forEach(function (input) {
  input.addEventListener('change', function () {
    console.log('[Bundler] Radio changed:', this.name, '=', this.value);
    // MutationObserver handle karega — no extra action needed
  });
});

// ── Boot ────────────────────────────────────────
watchVariantChange();

// ═══════════════════════════════════════════════
// Price update function for widgets End

function applyColors(root, colors) {
  root.style.setProperty('--qb-primary',     colors.primary_color        || '#1a1a2e');
  root.style.setProperty('--qb-selected-bg', colors.selected_bg          || '#f0f4ff');
  root.style.setProperty('--qb-badge-bg',    colors.badge_bg             || '#1a1a2e');
  root.style.setProperty('--qb-badge-text',  colors.badge_text           || '#ffffff');
  root.style.setProperty('--qb-text',        colors.text_color           || '#333333');
  root.style.setProperty('--qb-border',      colors.border_color         || '#e0e0e0');
  root.style.setProperty('--qb-original',    colors.original_price_color || '#999999');
  root.style.marginTop    = (colors.margin_top    || 16) + 'px';
  root.style.marginBottom = (colors.margin_bottom || 16) + 'px';
}
