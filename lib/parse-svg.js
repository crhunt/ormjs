function updateSvgDownloadLink() {
    var rawSvg = new XMLSerializer().serializeToString(d3.select("#canvas svg" ).node());
    console.log(rawSvg);
    d3.select("#downloadSvgButton").attr('href', "data:image/svg+xml;base64," + btoa( rawSvg ));
}