/* Menu for defining properties of objects */

var svg

var popwidth = 300;
var popheight = 300;

/* Draw menu */

function draw_popup(object) {

    // If the object kind isn't a key in popfun, don't generate popup
    var pop = { "entity": "lib/forms/entity-properties.html" }
    var popfun = {"entity": entity_form(object) }
    if (!(object.datum().kind in pop)) { return }

    // Only generate one popup per object
    if ( ! d3.select("#pop-"+object.attr("id")).empty() ) { return }

    var formfields = { "entity": ["#name","#refmode"] };

    d3.select("#entity_id")
        .html( `${object.attr("id")}` );

    // Append object
    var popup = svg.append("g")
        .datum( {x: -popwidth/2, y: -popheight/2} )
        .attr("class","popup_group")
        .attr("id", "pop-"+object.attr("id"))
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", popwidth)
        .attr("height", popheight)
        .attr("transform", translate(-popwidth/2, -popheight/2));
    popup.append("rect")
        .attr("class","popup")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", popwidth)
        .attr("height", popheight);

    // Append form
    popup.append("foreignObject")
        .attr("class","popup")
        .attr("width", popwidth)
        .attr("height", popheight)
        .append("xhtml:div")
            .attr("class","popup_content")
            .html(() => popfun[object.datum().kind]);
            //.html(`<iframe src='${pop[object.datum().kind]}' frameBorder="0" scrolling="no" class='popup_iframe'></iframe>`);

    // X for closing without saving
    var xsize = 15;
    var marg = 1.2*xsize;
    var pos = {x:popwidth-marg, y:marg}
    popup
        .append("path")
        .attr("d", function() { return xPath(pos,xsize) } )
        .attr("class","xclose")
        .attr("id", "xpop-"+object.attr("id"))
        .on("click", close_popup);

    // Make popup draggable
    var drag_popup = d3.drag()
        .on("start", pdragstarted)
        .on("drag", pdragged)
        .on("end", pdragended);

    popup
        .on("dblclick", (event) => { event.stopPropagation(); })
        .call(drag_popup);

    // Stop drag on form fields
    var drag_form = d3.drag()
        .on("start", (event) => { event.sourceEvent.stopPropagation(); })
    
    var formIDs = formfields[object.datum().kind];
    for (var n in formIDs ) {
        d3.select(formIDs[n])
            .call(drag_form);
    }

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

function popup_event(event,d) {

    event.stopPropagation();
    
    // Get the parent object
    var click_objID = d3.select(this).attr("id");
    var objID = get_rbgroupID(click_objID);
    // Create popup
    draw_popup( d3.select("#"+objID) );

}

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

function close_popup(event,d) {

    var xID = d3.select(this).attr("id");
    var popID = xID.substring(1,xID.length);
    var x = d.x + popwidth/2;
    var y = d.y + popheight/2;

    d3.select("#"+popID)
        .transition()
        .duration(600)
        .attr("transform", "translate(" + x + "," + y + ") scale(0)")
        .remove();
}

/* Forms */

function entity_form(entity) {
    var d = entity.datum();
    return `
    <div class="popup_form">
    <h1>Entity</h1>
        <form>
        <label for="fname">Name</label> 
        <input type="text" id="name" name="name" value="${d.name}" /><br>
        <label for="lname">Ref. mode</label> 
        <input type="text" id="refmode" name="refmode" />
        </form> 
    </div>
    `
}