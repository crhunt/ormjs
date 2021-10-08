/* Menu for defining properties of objects */

var svg

/* Draw menu */

function draw_popup(objname) {

    var width = 300;
    var height = 300;

    var pop = { "entity": "lib/forms/entity-properties.html" }

    // Append object
    var popup = svg.append("g")
        .datum( {x: -width/2, y: -height/2} )
        .attr("class","popup_group")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .attr("transform", translate(-width/2, -height/2));
    popup.append("rect")
        .attr("class","popup")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
    popup.append("foreignObject")
        .attr("class","popup")
        .attr("width", width)
        .attr("height", height)
        .append("xhtml:div")
            .attr("class","popup_content")
            .html(`<iframe src='${pop[objname]}' frameBorder="0" scrolling="no" class='popup_iframe'></iframe>`);

    // X for closing without saving
    var xsize = 15;
    var marg = 1.2*xsize;
    var pos = {x:width-marg, y:marg}
    popup
        .append("path")
        .attr("d", function() { return xPath(pos,xsize) } )
        .attr("class","xclose")

    // Make popup draggable
    var drag_popup = d3.drag()
        .on("start", pdragstarted)
        .on("drag", pdragged)
        .on("end", pdragended);

    popup
        .call(drag_popup);

}

function xPath(position, size) {

    // Draw the plus sign overlay for adding new roleboxes
    var hsize = size/2;
    return [
        "M", position.x-hsize, ",", position.y+hsize,
        "L", position.x+hsize, ",", position.y-hsize,
        "M", position.x-hsize, ",", position.y-hsize,
        "L", position.x+hsize, ",", position.y+hsize,
        "Z"
    ].join("");
}

/* Menu actions */

function pdragstarted(event) {
    event.sourceEvent.stopPropagation();
    //console.log("Drag initiated")
}

function pdragged(event,d) {

    d.x += event.dx;
    d.y += event.dy;

    d3.select(this)
        .attr("transform", translate(d.x, d.y));
}

function pdragended() {
    //console.log("event ended")
}