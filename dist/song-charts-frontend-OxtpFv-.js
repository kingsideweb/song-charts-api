// src/frontend.ts
jQuery(function() {
  const submitButton = $("#submit-button");
  const resetButton = $("#reset-button");
  const shareButton = $("#share-button");
  const monthInput = $("#Month");
  const dayInput = $("#Day");
  const yearInput = $("#Year");
  const resultsWrapper = $("#results-wrapper");
  const resultsHeading = $("#results-heading");
  const resultsContainer = $("#results-container");
  const loadingResultsSection = $("#loading-results");
  const noResultsSection = $("#empty-results");
  const errorResultsSection = $("#error-results");
  const resultsSection = $("#results");
  const errorMessage = $("#error-message");
  const resultsAnchor = $("#results-anchor");
  const notificationContainer = $("#notification-container");
  const notificationBlock = $("#notification-block");
  const milestone13Button = $("#milestone-13-button");
  const milestone16Button = $("#milestone-16-button");
  const milestone18Button = $("#milestone-18-button");
  const milestone21Button = $("#milestone-21-button");
  const milestone30Button = $("#milestone-30-button");
  const limit = 12;
  const ranking = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const resultsTitles = ranking.map((rank) => $(`#result-title-${rank}`));
  const resultsArtists = ranking.map((rank) => $(`#result-artist-${rank}`));
  const resultsChartTimes = ranking.map((rank) => $(`#result-chart-time-${rank}`));
  const resultsPreviewNotAvail = ranking.map((rank) => $(`#result-preview-not-available-${rank}`));
  let spotifyIframeAPI = null;
  const apiAddress = "https://song-charts-api-kkvgwykdtq-uk.a.run.app/top-tracks";
  submitButton.get(0)?.addEventListener("click", onSubmit);
  resetButton.get(0)?.addEventListener("click", onReset);
  shareButton.get(0)?.addEventListener("click", onShare);
  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    spotifyIframeAPI = IFrameAPI;
    console.log("Spotify iframe API ready");
    onReady();
  };
  defaultView();
  function onReady() {
    setTimeout(() => {
      const params = new URLSearchParams(document.location.search);
      const day = params.get("Day");
      const month = params.get("Month");
      const year = params.get("Year");
      const queryDate = `${year}-${month}-${day}`;
      if (!day || !month || !year) {
        defaultView();
        return;
      }
      loadingView();
      yearInput.val(year);
      monthInput.val(month);
      dayInput.val(day);
      fetchAndUpdate(queryDate);
      resultsAnchor.get(0)?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }
  function createEmbedController(element, options, callback) {
    if (!spotifyIframeAPI) {
      console.error("Spotify iframe API not ready");
      return;
    }
    spotifyIframeAPI.createController(element, options, callback);
  }
  function onReset(event) {
    event.preventDefault();
    window.location.search = "";
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
  function onShare(event) {
    event.preventDefault();
    const params = new URLSearchParams(document.location.search);
    navigator.clipboard.writeText(window.location.toString());
    console.log(`Copied window.location to clipboard`);
    notificationView();
  }
  async function onSubmit(event) {
    event.preventDefault();
    const year = Number(yearInput.val());
    const month = Number(monthInput.val());
    const day = Number(dayInput.val());
    const date = `${year}-${month < 10 ? "0" + month : month}-${day < 10 ? "0" + day : day}`;
    window.location.search = `Day=${day}&Month=${month}&Year=${year}`;
    loadingView();
    console.log(`Fetching songs for date ${date}`);
  }
  async function loadingView() {
    resultsSection.hide();
    noResultsSection.hide();
    errorResultsSection.hide();
    loadingResultsSection.show();
  }
  async function defaultView() {
    resultsSection.hide();
    errorResultsSection.hide();
    loadingResultsSection.hide();
    noResultsSection.show();
  }
  async function resultsView() {
    resultsHeading.show();
    resultsWrapper.show();
    resultsContainer.show();
    resultsSection.show();
    loadingResultsSection.hide();
    noResultsSection.hide();
    errorResultsSection.hide();
  }
  async function errorView(message) {
    resultsSection.hide();
    loadingResultsSection.hide();
    noResultsSection.hide();
    errorResultsSection.show();
    errorMessage.text(message);
    console.error(message);
  }
  async function notificationView() {
    notificationContainer.removeClass("notification-collapsed");
    setTimeout(() => {
      notificationContainer.addClass("notification-collapsed");
    }, 3500);
  }
  async function fetchAndUpdate(date, additionalFeatureParams) {
    const url = new URL(apiAddress);
    const [year, month, day] = date.split("-");
    url.searchParams.set("date", date);
    url.searchParams.set("limit", String(limit));
    history.pushState({ year, month, day }, "yyyy-mm-dd", `?Day=${day}&Month=${month}&Year=${year}&${additionalFeatureParams}`);
    const data = await fetch(url, {
      method: "get",
      headers: {
        "content-type": "application/json",
        origin: window.location.origin
      }
    }).then((res) => res.json());
    if (!data || !data.songs || data.songs.length === 0) {
      errorView(`Failed to get songs for date ${date}`);
    }
    updateResults(date, data.songs);
    resultsView();
  }
  function updateResults(date, songs) {
    const formattedDate = date;
    for (const { index, title, artist, weeksOnChart, spotifyId } of songs) {
      const rank = index + 1;
      resultsTitles[index].text(title);
      resultsArtists[index].text(artist);
      resultsChartTimes[index].text(`${weeksOnChart} weeks on chart`);
      if (spotifyId) {
        updateEmbed(rank, spotifyId);
        resultsPreviewNotAvail[index].hide();
        continue;
      }
      resultsPreviewNotAvail[index].show();
    }
    resultsHeading.text(`Top songs for ${convertDateFormat(formattedDate)}`);
    updateMilestones(date);
  }
  function updateMilestones(date) {
    console.log("Populating milestones");
    const born = getSearch("born") ?? date;
    const current = getSearch("milestone") ?? 0;
    const milestoneData = getMilestonesRelativeToBirth(born);
    const milestoneButtons = [
      milestone13Button,
      milestone16Button,
      milestone18Button,
      milestone21Button,
      milestone30Button
    ];
    milestoneButtons.forEach((button, index) => {
      button.text(milestoneData.years[index]);
      button.on("click", () => {
        fetchAndUpdate(milestoneData.dates[index], `born=${date}&milestone=${index}`);
      });
      if (index === current) {
        button.attr("disabled", "true");
      }
    });
  }
  function getMilestonesRelativeToBirth(date) {
    const dateParts = date.split("-");
    const babyYear = Number(dateParts[0]);
    const milestones = [0, 13, 16, 18, 21, 30];
    return {
      years: milestones.map((milestone) => {
        return babyYear + milestone;
      }),
      dates: milestones.map((milestone) => {
        return `${babyYear + milestone}-${dateParts.slice(1, -1).join("-")}`;
      })
    };
  }
  async function updateEmbed(rank, trackId) {
    const element = $(`#spotify-iframe-${rank}`).get(0);
    const child = document.createElement("div");
    element?.appendChild(child);
    if (!element || !child) {
      console.error(`Embed not found for rank ${rank}`);
      return;
    }
    const options = {
      width: "100%",
      height: "80",
      uri: `spotify:track:${trackId}`
    };
    const callback = (controller) => {
      controller.addListener("ready", () => {
        element.style.opacity = "1";
        element.parentElement?.querySelector(".embed-loader")?.remove();
      });
    };
    createEmbedController(child, options, callback);
    element.style.opacity = "0";
  }
  function getFormattedDate(date) {
    const yyyy = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate() + 2;
    const mm = m < 10 ? "0" + m : m;
    const dd = d < 10 ? "0" + d : d;
    return `${yyyy}-${mm}-${dd}`;
  }
  function getSearch(key) {
    return new URL(window.location.href).searchParams.get(key);
  }
  function convertDateFormat(dateString) {
    const [year, month, day] = dateString.split("-");
    return `${months[Number(month) - 1]} ${day}, ${year}`;
  }
});
