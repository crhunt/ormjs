/* Handling conversion to PNG. */

ormjs.PNG = class {

    static download(event, viewID, URItarget) {
        
        // Add styling to svg
        ormjs.InlineStyle.add(viewID);
        ormjs.PNG.set_svg_dimensions(viewID);
        ormjs.PNG.add_fonts(viewID);
        var svg = d3.select(`#${viewID}`);

        // Create a canvas. We copy the svg content here.
        var canvas = document.getElementById(`hc-${viewID}`);
        if (canvas == null) {
            ormjs.PNG.create_hidden_canvas(viewID);
            canvas = document.getElementById(`hc-${viewID}`);
        }
        canvas.setAttribute("width", svg.attr("width"));
        canvas.setAttribute("height", svg.attr("height"));
        var png_trigger = canvas.getAttribute("trigger");

        /* Set view svg to canvas */
        var img = ormjs.PNG.to_canvas(viewID, `hc-${viewID}`);

        /* Get URI of image and add to URItarget (download button) */
        img.addEventListener("load", function(){
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
        });

        // Remove styling from svg
        ormjs.InlineStyle.remove(viewID);
        ormjs.PNG.unset_svg_dimensions(viewID);
        svg.select("style").remove();
        
        png_trigger == "true" ? png_trigger = "false" : png_trigger = "true";
        canvas.setAttribute("trigger", png_trigger);
        
    }

    static to_canvas(viewID, canvasID) {

        var canvas = document.getElementById(canvasID);

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
            ctx.drawImage(img, 0, 0);    // This is actually where we draw the svg to the canvas
            DOMURL.revokeObjectURL(url); // Now we're done using the URL
        }

        return img
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

    static set_svg_dimensions(viewID) {

        // Div parent of view: get canvas dimensions from parent
        var svgparent = ormjs.GraphUtils.parent_node_id(viewID);
        
        // set SVG size as multiplier of parent dimensions
        var cnvsw = document.getElementById(svgparent).offsetWidth;
        var cnvsh = document.getElementById(svgparent).offsetHeight;
        var r = cnvsh / cnvsw;
        var setw = 3000;
        var seth = setw*r;
        
        d3.select(`#${viewID}`)
            .attr("width", setw)
            .attr("height", seth);
    }

    static unset_svg_dimensions(viewID) {
        d3.select(`#${viewID}`)
            .attr("width", "100%")
            .attr("height", "100%");
    }

    static add_fonts(viewID) {
        var s = `@font-face {
            font-family: 'Montserrat Light';
            src: url(${ormjs.Fonts.montserrat()})  format('truetype');
        }`;
        s += `@font-face {
            font-family: 'Symbola';
            src: url(${ormjs.Fonts.symbola()})  format('truetype');
        }`;
        d3.select(`#${viewID}`).append("style").text(s);
    }

}