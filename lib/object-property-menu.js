/* Menu for defining properties of objects */

var svg

var popwidth = 300;
var popheight = 300;

// The updateable fields for each object type
var formfields = { "entity": ["name","refmode"] };

/* Draw menu */

function draw_popup(object) {

    console.log( object.datum().kind );

    // If the object kind isn't a key in popfun, don't generate popup
    //var pop = { "entity": "lib/forms/entity-properties.html" }
    var popfun = { "entity": function() { return entity_form(object) },
                   "rolebox_group": function() { return role_form(object) } };
    if ( ! (object.datum().kind in popfun) ) { return }

    // Only generate one popup per object
    if ( ! d3.select("#pop-"+object.attr("id")).empty() ) { return }

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
            .html(() => { return popfun[ object.datum().kind ]() });
            //.html(`<iframe src='${pop[object.datum().kind]}' frameBorder="0" scrolling="no" class='popup_iframe'></iframe>`);

    // Append Submit svg
    var chsize = {x:28, y: 20};
    var chmarg = {x:10, y:4, ex:30, ey:15};
    var chpos = {x: popwidth - chmarg.ex - chsize.x,
                 y: popheight - chmarg.ey - chsize.y };
    /*d3.select("#submit-"+object.attr("id"))
        .append("svg")
            .attr("id","svg-submit-"+object.attr("id"))
            .attr("class", "submit_svg")
            .attr("width", chsize.x+2*chmarg.x)
            .attr("height", chsize.y+2*chmarg.y)*/
    popup
        .append("g")
            .attr("id", "submit-"+object.attr("id"))
            .attr("x", popwidth - chmarg.ext)
            .attr("y", popheight - chmarg.ext);
    d3.select("#submit-"+object.attr("id"))
        .append("rect")
            .attr("id", "#submit-r-"+object.attr("id"))
            .attr("class", "submit_svg")
            .attr("x", chpos.x)
            .attr("y", chpos.y)
            .attr("width", chsize.x+2*chmarg.x)
            .attr("height", chsize.y+2*chmarg.y);
    d3.select("#submit-"+object.attr("id"))
        .append("path")
            .attr("d", () => { return checkPath(chpos,chsize,chmarg) } )
            .attr("class","spath")
            .attr("id", "spop-"+object.attr("id"));
    d3.select("#submit-"+object.attr("id"))
        .on("mouseover", () => { 
            d3.select("#spop-"+object.attr("id"))
                .attr("stroke-width",6);
        })
        .on("click", () => update_object(object));

    // Append X for closing without saving
    var xsize = 15;
    var xmarg = 1.2*xsize;
    var xpos = {x:popwidth-xmarg, y:xmarg};
    popup
        .append("path")
        .attr("d", () => { return xPath(xpos,xsize) } )
        .attr("class","xclose")
        .attr("id", "xpop-"+object.attr("id"));
    d3.select("#xpop-"+object.attr("id"))
        .on("click", close_popup);

    // Make popup draggable
    var drag_popup = d3.drag()
        .on("start", pdragstarted)
        .on("drag", pdragged)
        .on("end", pdragended);

    popup
        .on("dblclick", (event) => { event.stopPropagation(); })
        .on("contextmenu", (event) => { event.stopPropagation(); })
        .call(drag_popup);

    // Stop drag on form fields
    var drag_form = d3.drag()
        .on("start", (event) => { event.sourceEvent.stopPropagation(); });
    
    var formIDs = formfields[object.datum().kind];
    for (var n in formIDs ) {
        d3.select("#"+formIDs[n]+"-"+object.attr("id"))
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

function checkPath(position, size, margin) {

    // Draw the plus sign overlay for adding new roleboxes
    return [
        "M", position.x+size.x+margin.x, ",", position.y+margin.y,
        "L", position.x+(size.x+margin.x)/2, ",", size.y+position.y+margin.y/2,
        "L", position.x+margin.x, ",", position.y+(size.y+margin.y)/1.7,
        "M", position.x+size.x, ",", position.y+margin.y,
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
}

function pdragged(event,d) {

    d.x += event.dx;
    d.y += event.dy;

    d3.select(this)
        .attr("transform", translate(d.x, d.y));
}

function pdragended() {
    return
}

function close_popup(event,d) {

    var xID = d3.select(this).attr("id");
    var popID = xID.substring(1,xID.length);
    remove_popup( d3.select("#"+popID) );
}

function remove_popup(popup) {

    d = popup.datum();
    var x = d.x + popwidth/2;
    var y = d.y + popheight/2;

    popup
        .transition()
        .duration(600)
        .attr("transform", "translate(" + x + "," + y + ") scale(0)")
        .remove();
}

function update_object(object) {
    // Use the data submitted on the form to update the object.
    var d = object.datum();
    var formIDs = formfields[object.datum().kind];
    for (var n in formIDs ) {
        var fieldval = d3.select(`#${formIDs[n]}-${object.attr("id")}`).property("value");
        if(fieldval.length > 0) {
            d[ formIDs[n] ] = fieldval;
        }
    }

    // Update names
    update_name(object);

    // Update rel
    parse_orm();

    // Remove popup
    remove_popup( d3.select("#pop-"+object.attr("id")) );
}

function update_name(object) {
    if (object.datum().kind == "entity") {
        update_entity_name(object);
    }
}

function update_rbgroup(rbgroup) {
    return
}

/* Forms */

function entity_form(entity) {
    var d = entity.datum();
    var entityID = entity.attr("id");
    console.log("entity!");
    return `
    <div class="popup_form">
    <h1>Entity</h1>
        <table class="form_table">
        <tr>
        <td class="left_col"><label for="fname">Name</label></td>
        <td class="right_col"><input type="text" id="name-${entityID}" name="name" value="${d.name}" /></td>
        </tr>
        <tr>
        <td class="left_col"><label for="lname">Ref. mode</label></td>
        <td class="right_col"><input type="text" id="refmode-${entityID}" name="refmode" value="${d.refmode}" /></td>
        </tr>
        </table>
    </div>
    `
}

function role_form(rbgroup) {
    var gd = rbgroup.datum();
    var boxes = [...gd.boxes];
    console.log("role!")
    var rbox = d3.select("#"+gd.boxes[0]);
    var d = rbox.datum();
    var form_html = `
    <div class="popup_form">
    <h1>Role</h1>
        <table class="form_table">
        <tr>
        <td class="left_col"><label for="fname">Name</label></td>
        <td class="right_col"><input type="text" id="name-${rbox.attr("id")}" name="name" value="${d.name}" /></td>
        </tr>`;
    var rng = range(boxes.length-2, startAt=2);
    for ( var n in rng ) {
        console.log(n, rng[n], boxes[ rng[n] ])
        rbox = d3.select("#"+boxes[ rng[n] ]);
        d = rbox.datum();
        form_html += 
        `<tr>
        <td class="left_col"><label for="lname">...</label></td>
        <td class="right_col"><input type="text" id="name-${rbox.attr("id")}" name="name" value="${d.name}" /></td>
        </tr>`
    }
    form_html += 
        `</table>
    </div>
    `;
    return form_html
}

function range(size, startAt = 0) {
    return [...Array(size).keys()].map(i => i + startAt);
}