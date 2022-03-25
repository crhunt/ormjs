/* Handling upload and download events. */

ormjs.PNG = class {

    static download(event, viewID, URItarget) {
        
        // Add styling to svg
        add_style_data(viewID);

        // Div parent to view
        var svgparent = ormjs.GraphUtils.parent_node_id(viewID);
        // SVG
        var svg = d3.select(`#${viewID}`);
        
        // Firefox bug: set SVG size
        var cnvsw = document.getElementById(svgparent).offsetWidth;
        var cnvsh = document.getElementById(svgparent).offsetHeight;
        var r = cnvsh / cnvsw;
        var setw = 3000;
        var seth = setw*r;
        var svgw = svg.attr("width");
        var svgh = svg.attr("height");
        svg
            .attr("width", setw)
            .attr("height", seth);

        // Create a canvas. We copy the svg content here.
        var canvas = document.getElementById(`hc-${viewID}`);
        if (canvas == null) {
            ormjs.PNG.create_hidden_canvas(viewID);
            canvas = document.getElementById(`hc-${viewID}`);
        }
        canvas.setAttribute("width", setw);
        canvas.setAttribute("height", seth);
        var png_trigger = canvas.getAttribute("trigger");
        console.log("png_trigger", png_trigger, typeof(png_trigger))

        // Convert SVG to XML
        var ctx = canvas.getContext('2d');
        var rawSvg = new XMLSerializer().serializeToString(d3.select(`#${viewID}` ).node());
        var DOMURL = window.URL || window.webkitURL || window;

        // Create URL for image
        var img = new Image();
        //var svgBlob = new Blob([rawSvg], {type: 'image/svg+xml;charset=utf-8'});
        var svgBlob = new Blob([rawSvg], {type: 'image/svg+xml;base64'});
        var url = DOMURL.createObjectURL(svgBlob);
        //var url = "data:image/svg+xml;base64," + utoa( rawSvg );
        img.src = url; // Set canvas to svg

        img.onload = function () {
            ctx.drawImage(img, 0, 0); // This is actually where we draw the svg to the canvas
            DOMURL.revokeObjectURL(url); // Now we're done using the URL
        
            if (png_trigger == "true") {
                var imgURI = canvas
                    .toDataURL('image/png')
                    .replace('image/png', 'image/octet-stream');
            
                d3.select(`#${URItarget}`).attr('href', imgURI);
                //ormjs.PNG.trigger_click_event(URItarget);
                var event_target = event.target.id.toString();
                document.getElementById(event_target).dispatchEvent(event);
            } else {
                d3.select(`#${URItarget}`).attr('href', null);
            }
        }

        // Remove styling from svg
        remove_style_data(viewID);

        svg
            .attr("width", svgw)
            .attr("height", svgh);
        
        png_trigger == "true" ? png_trigger = "false" : png_trigger = "true";
        canvas.setAttribute("trigger", png_trigger);
        
    }

    static trigger_click_event(id) {
        var evt = new MouseEvent('click', {
            view: window,
            bubbles: false,
            cancelable: true
        });
        
        document.getElementById(id).dispatchEvent(evt);
    }

    static create_hidden_canvas(viewID) {

        var parentID = ormjs.GraphUtils.parent_node_id(viewID);

        d3.select(`#${parentID}`).append("div")
            .attr("class", "ormjs-hidden-canvas-container")
            .append("canvas")
                .attr("trigger", "false")
                .attr("class", "ormjs-hidden-canvas")
                .attr("id", `hc-${viewID}`);
    }

}