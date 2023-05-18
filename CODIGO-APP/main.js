// ------------------ APIs & API Keys ------------------

const currencyUrl = "https://api.getgeoapi.com/v2/currency";
const currencyApiKey = "c84abc9fe14642331516f0d5f3b50276d5659961";

const historicalUrl = "https://api.freecurrencyapi.com/v1/historical";
const historicalApiKey = "cDmBBD7LGA57uUikc705v22ujl54XlWs9yo98GcI";

const cryptosUrl = "https://api.coinpaprika.com/v1";
const cryptosApiKey = "cDmBBD7LGA57uUikc705v22ujl54XlWs9yo98GcI";

// ------------------ HTML elements ------------------

const $currencyAmount = document.querySelector("#currencyAmount");
const $currencySelect = document.querySelector("#currencySelect");
const $cryptoAmount = document.querySelector("#cryptoAmount");
const $cryptoSelect = document.querySelector("#cryptoSelect");
const $estimatedPrice = document.querySelector("#estimatedPrice");

const $inpDate = document.querySelector("#inpDate");
const $convertChart = document.querySelector("#convertChart");
const $chartDescription = document.querySelector("#chartDescription");

const $errorCard = document.querySelector("#error");

let conversionChart;

initApp();

function initApp() {
  $inpDate.value = new Date().toISOString().split("T")[0];
  disableForm();
  addSelectsOptions();
  addEvents();
  Promise.all([getCryptoPrice("btc-bitcoin")]).then((results) =>
    setInputValues(results[0].toFixed(8))
  );
  generatePriceText({
    currency: "USD",
    crypto: "btc-bitcoin",
  });
  generateChart({
    currency: "USD",
    crypto: "btc-bitcoin",
    date: $inpDate.value,
  });
}

function addSelectsOptions() {
  addCurrenciesOptions();
  addCryptosOptions();
}

function addCurrenciesOptions() {
  const params = {
    api_key: currencyApiKey,
  };

  fetch(buildUrl(`${currencyUrl}/list`, params))
    .then(apiToJson)
    .then((apiJson) => {
      const currencies = apiJson.currencies;
      let options = "";
      for (let currencyCode in currencies) {
        options += `<option value="${currencyCode}">${currencyCode}</option>`;
      }

      $currencySelect.innerHTML = options;

      // Default value
      $currencySelect.value = "USD";
    })
    .catch((error) => console.log(error));
}

function addCryptosOptions() {
  fetch(buildUrl(`${cryptosUrl}/coins`))
    .then(apiToJson)
    .then((apiJson) => {
      const cryptos = apiJson.slice(0, 50);
      let options = "";

      for (let cryptoIndex in cryptos) {
        options += `<option value="${cryptos[cryptoIndex].id}">${cryptos[cryptoIndex].symbol}</option>`;
      }

      $cryptoSelect.innerHTML = options;

      // Default value
      $cryptoSelect.value = "btc-bitcoin";
    })
    .catch((error) => console.log(error))
    .finally(enableForm);
}

function setInputValues(currencyValue) {
  $currencyAmount.value = currencyValue;
  $cryptoAmount.value = 1;
}

function addEvents() {
  $currencyAmount.addEventListener("input", () =>
    convert(
      {
        currency: $currencySelect.value,
        crypto: $cryptoSelect.value,
        amount: $currencyAmount.value,
      },
      true
    )
  );
  $cryptoAmount.addEventListener("input", () =>
    convert(
      {
        currency: $currencySelect.value,
        crypto: $cryptoSelect.value,
        amount: $currencyAmount.value,
      },
      false
    )
  );
  $currencySelect.addEventListener("change", () => {
    let data = {
      currency: $currencySelect.value,
      crypto: $cryptoSelect.value,
      amount: 1,
    };
    setInputValues(1);
    convert(data, true);
    generatePriceText(data);
    if (validateDate())
      generateChart({
        currency: $currencySelect.value,
        crypto: $cryptoSelect.value,
        date: $inpDate.value,
      });
  });
  $cryptoSelect.addEventListener("change", () => {
    let data = {
      currency: $currencySelect.value,
      crypto: $cryptoSelect.value,
      amount: 1,
    };
    setInputValues(1);
    convert(data, false);
    generatePriceText(data);
    if (validateDate())
      generateChart({
        currency: $currencySelect.value,
        crypto: $cryptoSelect.value,
        date: $inpDate.value,
      });
  });

  $inpDate.addEventListener("change", () => {
    if (validateDate())
      generateChart({
        currency: $currencySelect.value,
        crypto: $cryptoSelect.value,
        date: $inpDate.value,
      });
  });
}

function generatePriceText(data) {
  Promise.all([getCryptoPrice(data.crypto), getCurrencyPrice(data.currency)])
    .then((results) => {
      const cryptoPrice = results[0];
      const currencyPrice = results[1];

      const cryptoPriceInCurrency = cryptoPrice / currencyPrice;
      $estimatedPrice.innerHTML = `1 ${data.crypto
        .split("-")[0]
        .toUpperCase()} = ${cryptoPriceInCurrency.toFixed(8)} ${data.currency}`;
    })
    .catch((error) => console.log(error));
}

function generateChart(data) {
  if (conversionChart !== undefined) {
    conversionChart.destroy();
  }

  params = {
    start: getStartDate(data.date),
    end: data.date,
    interval: "1d",
  };

  let pricesInDollars = [];
  return fetch(
    buildUrl(`${cryptosUrl}/tickers/${data.crypto}/historical`, params)
  )
    .then(apiToJson)
    .then((jRes) => {
      jRes.map((obj) => pricesInDollars.push(obj.price));
      return pricesInDollars;
    })
    .then((prices) => convertHistoricalPrices(prices, data.currency))
    .then((prices) => {
      conversionChart = new Chart($convertChart, {
        type: "line",
        data: {
          labels: ["Día 1", "2", "3", "4", "5", "6", "7"],
          datasets: [
            {
              label: "",
              data: prices,
              borderWidth: 1,
              borderColor: "#38D4B8",
              pointBackgroundColor: "#38D4B8",
            },
          ],
        },
        options: {
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: "white",
              },
              grid: {
                color: "transparent",
              },
            },
            x: {
              ticks: {
                color: "white",
              },
              grid: {
                color: "transparent",
              },
            },
          },
        },
      });
      $chartDescription.innerHTML = `Cotización de ${data.crypto
        .split("-")[0]
        .toUpperCase()} en ${
        data.currency
      } 7 días hacia atrás a partir del ${new Date(
        data.date
      ).toLocaleDateString("es-ES")}.`;
    })
    .catch((error) => console.log(error));
}

function convertHistoricalPrices(pricesInDollars, currency) {
  prices = [];
  return Promise.all([getCurrencyPrice(currency)]).then((results) => {
    const currencyPrice = results[0];

    pricesInDollars.map((price) => {
      const cryptoPriceInCurrency = price / currencyPrice;

      prices.push(cryptoPriceInCurrency);
    });
    return prices;
  });
}

function convert(data, currencyUpdated) {
  Promise.all([getCryptoPrice(data.crypto), getCurrencyPrice(data.currency)])
    .then((results) => {
      const cryptoPrice = results[0];
      const currencyPrice = results[1];

      if (currencyUpdated) {
        const currencyPriceInCrypto = currencyPrice / cryptoPrice;

        $cryptoAmount.value = (
          currencyPriceInCrypto * $currencyAmount.value
        ).toFixed(8);
      } else {
        const cryptoPriceInCurrency = cryptoPrice / currencyPrice;
        $currencyAmount.value = (
          cryptoPriceInCurrency * $cryptoAmount.value
        ).toFixed(8);
      }
    })
    .catch((error) => console.log(error));
}

function getCryptoPrice(crypto) {
  const params = {
    base_currency_id: crypto,
    quote_currency_id: "usd-us-dollars",
    amount: 1,
  };

  return fetch(buildUrl(`${cryptosUrl}/price-converter`, params))
    .then(apiToJson)
    .then((jRes) => jRes.price)
    .catch((error) => console.log(error));
}

function getCurrencyPrice(currency) {
  const params = {
    api_key: currencyApiKey,
    from: currency,
    to: "USD",
    amount: 1,
  };

  return fetch(buildUrl(`${currencyUrl}/convert`, params))
    .then(apiToJson)
    .then((jRes) => jRes.rates.USD.rate_for_amount)
    .catch((error) => console.log(error));
}

function getStartDate(date) {
  const dateObj = new Date(date);
  dateObj.setDate(dateObj.getDate() - 7);
  return dateObj.toISOString().split("T")[0];
}

function buildUrl(url, params) {
  const urlObj = new URL(url);

  if (params !== undefined) {
    const paramsObj = new URLSearchParams(params);
    urlObj.search = paramsObj.toString();
  }

  return urlObj;
}

function disableForm() {
  $currencyAmount.setAttribute("disabled", true);
  $currencySelect.setAttribute("disabled", true);
  $cryptoAmount.setAttribute("disabled", true);
  $cryptoSelect.setAttribute("disabled", true);
  $inpDate.setAttribute("disabled", true);
}

function enableForm() {
  $currencyAmount.removeAttribute("disabled");
  $currencySelect.removeAttribute("disabled");
  $cryptoAmount.removeAttribute("disabled");
  $cryptoSelect.removeAttribute("disabled");
  $inpDate.removeAttribute("disabled");
}

function validateDate() {
  if (new Date($inpDate.value) > new Date().getTime()) {
    showError();
    return false;
  } else {
    hideError();
    return true;
  }
}

function apiToJson(apiRaw) {
  return apiRaw.json();
}

function showError(error) {
  console.error("CATCH", error);
  $errorCard.classList.remove("hidden");
}

function hideError() {
  $errorCard.classList.add("hidden");
}
