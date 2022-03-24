/* Menu for defining properties of objects */

// Note: This is encapsulated but could use considerable cleanup

var ormjs;
ormjs.propmenu = {};

/* Keep track of open popups */
ormjs.propmenu.open_popups = [];

/* The updateable fields for each object type.
   We iterate over these on update events. */
ormjs.propmenu.formfields = { 
    "entity": ["name","refmode","independent",
                "rtpopular","rtgeneral","rtunit"],
    "value": ["name","independent"],
    "rolebox": ["name"],
    "rolebox_group": ["rname"],
    "constraint": ["type", "content"] 
};
/* Unless specified here, all fields need to have a value for 
   an update event to take place. */
ormjs.propmenu.allowed_empty_fields = { 
    "entity": ["independent", "refmode"],
    "value": ["independent"],
    "rolebox": [],
    "rolebox_group": ["rname"],
    "constraint": ["content"] 
};

/* Draw menu */

ormjs.PropertyMenu = class {

    static draw_popup(object) {

        /* 
        Create a new popup for object. Note that objects here are d3 objects, not class
        objects..!
        */

        // For each object, set the function that generates the form.
        var popfun = { "entity": function() { return ormjs.PropertyMenu.entity_form(object) },
                    "rolebox_group": function() { return ormjs.PropertyMenu.fact_form(object) },
                    "value": function() { return ormjs.PropertyMenu.value_form(object) },
                    "constraint": function() { return ormjs.PropertyMenu.constraint_form(object) } };
        // If the object kind isn't a key in popfun, don't generate popup
        if ( ! (object.datum().kind in popfun) ) { return }

        // Only generate one popup per object
        if ( ! d3.select("#pop-"+object.attr("id")).empty() ) { return }

        /*d3.select("#entity_id")
            .html( `${object.attr("id")}` );*/

        var svg = ormjs.Graph.any_object(object.datum().view).d3object;
        var popwidth = ormjs.size.popup.width;
        var popheight = ormjs.size.popup.height;

        // Append popup to svg
        var popup = svg.append("g")
            .datum( {x: -popwidth/2, y: -popheight/2} )
            .attr("class","ormjs-popup_group")
            .attr("id", "pop-"+object.attr("id"))
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", popwidth)
            .attr("height", popheight)
            .attr("transform", ormjs.Graph.translate(-popwidth/2, -popheight/2));
        popup.append("rect")
            .attr("class","ormjs-popup")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", popwidth)
            .attr("height", popheight);

        // Append form
        popup.append("foreignObject")
            .attr("class","ormjs-popup")
            .attr("width", popwidth)
            .attr("height", popheight)
            .append("xhtml:div")
                .attr("class","ormjs-popup_content")
                .html(() => { return popfun[ object.datum().kind ]() });

        var first_field_id = `name-${object.attr("id")}`;
        if (object.datum().kind == "rolebox_group") {
            // Uniqueness constraints for rolebox group form
            ormjs.PropertyMenu.popup_rbgroup(object);
            // First field on form is different
            first_field_id = `name-r-0-${object.attr("id")}`; // Used to focus on field
        }
        if (object.datum().kind == "constraint") {
            ormjs.PropertyMenu.popup_constraint(object);
            first_field_id = null;
        }
        // Append Submit svg
        ormjs.PropertyMenu.append_submit(popup, object);

        // Append X for closing without saving
        ormjs.PropertyMenu.append_close(popup, object);

        // Make popup draggable
        var drag_popup = d3.drag()
            .on("start", ormjs.PropertyMenu.dragstarted)
            .on("drag", ormjs.PropertyMenu.dragged)
            .on("end", ormjs.PropertyMenu.dragended);

        // Drag popup
        popup
            .on("dblclick", (event) => { event.stopPropagation(); })
            .on("contextmenu", (event) => { event.stopPropagation(); })
            .call(drag_popup);

        // Stop drag on form fields
        ormjs.PropertyMenu.no_drag_fields(object);
        // Focus on name field
        if (first_field_id != null){ document.getElementById(first_field_id).focus(); }

        // Add to list
        ormjs.propmenu.open_popups.push(popup);

    }

    static append_close(popup,object) {

        /* Add a close X button to top right corner of popup */

        // Size is set by CSS stylesheet popup-style.css
        var xsize = ormjs.size.popup.close;
        var xmarg = 1.2*xsize;
        var popwidth = ormjs.size.popup.width;
        var xpos = {x:popwidth-xmarg, y:xmarg};
        popup
            .append("path")
            .attr("d", () => { return ormjs.PropertyMenu.xPath(xpos,xsize) } )
            .attr("class","ormjs-xclose")
            .attr("id", "xpop-"+object.attr("id"));
        d3.select("#xpop-"+object.attr("id"))
            .on("click", ormjs.PropertyMenu.close_popup);
    }

    static append_submit(popup, object) {

        /* Add a submit check button to bottom right corner of popup */

        // Dimensions
        var popwidth = ormjs.size.popup.width;
        var popheight = ormjs.size.popup.height;
        var stroke_sz = ormjs.size.popup.stroke;
        var stroke_sz_h = ormjs.size.popup.hover_stroke;
        var chsize = ormjs.size.popup.check;
        var xmarg = ormjs.size.popup.close;
        var chmarg = {x: chsize.x/2 - chsize.m, y: chsize.m, ex:2*xmarg, ey:xmarg};
        var chpos = {x: popwidth - chmarg.ex - chsize.x,
                    y: popheight - chmarg.ey - chsize.y };
        // Draw the check
        popup
            .append("g")
                .attr("id", "submit-"+object.attr("id"))
                .attr("x", popwidth - chmarg.ex)
                .attr("y", popheight - chmarg.ey);
        d3.select("#submit-"+object.attr("id"))
            .append("rect")
                .attr("id", "#submit-r-"+object.attr("id"))
                .attr("class", "ormjs-submit_svg")
                .attr("x", chpos.x)
                .attr("y", chpos.y)
                .attr("width", chsize.x+2*chmarg.x)
                .attr("height", chsize.y+2*chmarg.y);
        d3.select("#submit-"+object.attr("id"))
            .append("path")
                .attr("d", () => { return ormjs.PropertyMenu.checkPath(chpos,chsize,chmarg) } )
                .attr("class","ormjs-spath")
                .attr("id", "spop-"+object.attr("id"))
                .attr("stroke-width", stroke_sz);
        // Add actions
        d3.select("#submit-"+object.attr("id"))
            // Highlight on mouseover
            .on("mouseover", () => { 
                d3.select("#spop-"+object.attr("id"))
                    .attr("stroke-width", stroke_sz_h)
                    .attr("stroke-opacity", 1.0);
            })
            // No highlight on mouse out
            .on("mouseout", () => { 
                d3.select("#spop-"+object.attr("id"))
                    .attr("stroke-width", stroke_sz)
                    .attr("stroke-opacity", 0.6);
            })
            // On click, update object
            .on("click", () => ormjs.PropertyMenu.update_object(object));
    }

    static xPath(position, size) {

        // Draw the X for closing the popup form
        var hsize = size/2;
        return [
            "M", position.x-hsize, ",", position.y+hsize,
            "L", position.x+hsize, ",", position.y-hsize,
            "M", position.x-hsize, ",", position.y-hsize,
            "L", position.x+hsize, ",", position.y+hsize,
            "Z"
        ].join("");
    }

    static checkPath(position, size, margin) {

        // Draw the check for submitting the popup form
        return [
            "M", position.x+size.x+margin.x, ",", position.y+margin.y,
            "L", position.x+(size.x+margin.x)/2, ",", size.y+position.y+margin.y/2,
            "L", position.x+margin.x, ",", position.y+(size.y+margin.y)/1.7,
            "M", position.x+size.x, ",", position.y+margin.y,
            "Z"
        ].join("");
    }

    /* Menu actions */

    static popup_event(event,d) {

        /* Object click event for creating a popup */

        event.stopPropagation(); // Don't go creating entities on double-click

        // Get the parent object
        //var click_objID = d3.select("this").attr("id");
        // Note: d3.select(this) works for ctrl+click events but not right click menu
        var click_objID = event.target.id.toString();//.substring(0,event.target.length);
        var objID = ormjs.Graph.get_parentID(click_objID);
        // Create popup
        ormjs.PropertyMenu.draw_popup( d3.select("#"+objID) );

    }

    static dragstarted(event) {
        // Drag the popup
        event.sourceEvent.stopPropagation();
        d3.select(this).style("cursor", "grabbing");
    }

    static dragged(event,d) {

        // Drag the popup

        d.x += event.dx;
        d.y += event.dy;

        d3.select(this)
            .attr("transform", ormjs.Graph.translate(d.x, d.y));
    }

    static dragended(event) {
        d3.select(this).style("cursor", "grab");
    }

    static close_popup(event,d) {

        /* On X click event */

        var xID = d3.select(this).attr("id");
        var popID = xID.substring(1,xID.length);
        ormjs.PropertyMenu.remove_popup( d3.select("#"+popID) );
    }

    static remove_popup(popup) {

        /* Remove the popup visualization */

        var popwidth = ormjs.size.popup.width;
        var popheight = ormjs.size.popup.height;

        var d = popup.datum();
        var x = d.x + popwidth/2;
        var y = d.y + popheight/2;

        ormjs.propmenu.open_popups = ormjs.GraphUtils.remove_from_array(ormjs.propmenu.open_popups, popup);

        popup
            .transition()
            .duration(600)
            .attr("transform", "translate(" + x + "," + y + ") scale(0)")
            .remove();
    }

    static remove_all_popups(_callback) {
        
        /* Close all popup groups. This is done before saving svg. */
        
        // Get all popup groups
        var popup_groups = d3.select("svg").selectAll(".popup_group");
        for ( k in popup_groups.nodes() ) { 
            // Add entity to entities list
            var popID = popup_groups.nodes()[k].id;
            d3.select("#"+popID).remove();
        }
        _callback();
    }

    static no_drag_fields(object) {
        
        /* Stop drag on form fields. 
        --> Don't want to drag the popup instead of highlighting text. */

        var drag_form = d3.drag()
            .on("start", (event) => { event.sourceEvent.stopPropagation(); });
        
        // Fields that belong to the parent object
        var formIDs = ormjs.propmenu.formfields[object.datum().kind];
        for (var n in formIDs ) {
            d3.select("#"+formIDs[n]+"-"+object.attr("id"))
            .call(drag_form);
        }
        // Rolebox name fields
        if ( object.datum().kind == "rolebox_group" ){
            var boxes = [...object.datum().boxes];
            delete boxes[1]; // One name field for the first 2 boxes cuz orm is difficult like that
            for (var n in boxes) {
                d3.select("#name-"+boxes[n]).call(drag_form);
            }
            // Don't drag uniqueness constraint boxes
            d3.select("#popsvg-"+object.attr("id"))
            .call(drag_form);
        }

        // Check and X xpop- submit-
        d3.select("#xpop-"+object.attr("id"))
        .call(drag_form);
        d3.select("#submit-"+object.attr("id"))
        .call(drag_form);

    }

    static enter_last_popup() {

        /* Hitting the enter key acts like submit on the most recent popup. */

        var popup = ormjs.propmenu.open_popups[ormjs.propmenu.open_popups.length-1];
        var objID = popup.attr("id").substring(4,popup.attr("id").length);
        var object = d3.select("#"+objID);
        ormjs.PropertyMenu.update_object(object);
        ormjs.propmenu.open_popups = ormjs.GraphUtils.remove_from_array(ormjs.propmenu.open_popups, popup);
    }

    /* Updates */

    static update_object(object) {

        /* Actions on popup form submit */
        
        // Use the data submitted on the form to update the object datum.
        ormjs.PropertyMenu.update_fields(object);

        // Update individual rolebox attributes
        if (object.datum().kind == "rolebox_group") {
            ormjs.PropertyMenu.update_rolebox_fields(object);
            ormjs.PropertyMenu.set_rbgroup_uconstraints(object);
        }
        // Update Constraint appearance
        if (object.datum().kind == "constraint") {
            var constID = object.attr("id");
            var constraints = ormjs.models[object.datum().model].objects.constraint;
            constraints[constID].redraw();
        }

        // Update names
        ormjs.PropertyMenu.update_name(object);

        // Remove popup
        ormjs.PropertyMenu.remove_popup( d3.select("#pop-"+object.attr("id")) );

        // Update rel
        ormjs.models[object.datum().model].update();
    }

    static update_fields(object) {
        
        /* Update the datum of object, where names in formIDs 
        match datum attributes.
        
        Note we assume all values should be strings or boolean. */
        
        // All form ids
        var formIDs = ormjs.propmenu.formfields[object.datum().kind];
        // Only these form ids can be empty
        var allowedEmptyIDs = ormjs.propmenu.allowed_empty_fields[object.datum().kind];
        var d = object.datum();
        for (var n in formIDs ) {
            var field = d3.select(`#${formIDs[n]}-${object.attr("id")}`);
            var fieldval = field.property("value");
            var fieldkey = field.property("name");
            if (field.property("type") == "checkbox") {
                fieldval = field.property("checked");
            }
            if (field.property("type") == "radio") {
                if ( !field.property("checked") ) {
                    fieldval = false;
                }
            }
            // Ensure field is not empty (unless allowed)
            if( fieldval || allowedEmptyIDs.includes(formIDs[n]) ) {
                // Set datum to field value
                d[ fieldkey ] = fieldval;
            }
        }
    }

    static update_rolebox_fields(object) {

        /* 
        The fact popup changes datum of individual roleboxes. 
        We handle that here.

        Setting rolebox names.
        */

        //var formIDs = formfields["rolebox"];
        var boxes = [...object.datum().boxes];
        // Flip the boxes to "forward" order if reversed to match popup
        // box order.
        if (object.datum().flipped) { boxes.reverse(); }
        if (boxes.length == 1) {
            // Set rolebox name based on full value in field (no splitting)
            ormjs.PropertyMenu.update_fields( d3.select("#"+boxes[0]) );
        }
        if (boxes.length > 1) {
            // Split words in first 2 boxes
            var fieldval = d3.select(`#name-${boxes[0]}`).property("value");
            var role_names = ormjs.PropertyMenu.split_role_name(fieldval);
            d3.select("#"+boxes[0]).datum().name = role_names[0];
            d3.select("#"+boxes[1]).datum().name = role_names[1];
        }
        // Assign rest of boxes
        if (boxes.length > 2) {
            var rng = ormjs.GraphUtils.range(boxes.length-2,2);
            for ( var n in rng ) {
                ormjs.PropertyMenu.update_fields( d3.select("#"+boxes[rng[n]]) );
            }
        }
    }

    static set_rbgroup_uconstraints(rbgroup) {
        
        /* Set the fact uniqueness constraints based on the popup values */
        
        var predicates = ormjs.models[rbgroup.datum().model].objects["rolebox_group"];

        // UC's only on predicates of size > 1
        //if ( rbgroup.datum().boxes.length == 1 ) { return }
        
        // Get the rolebox group shown in the popup
        var rbg = d3.select("#pop-rbg-"+rbgroup.attr("id"));
        if (rbg.classed("ormjs-notparsed")) { 
            // Don't set uniqueness constraints if the combination
            // isn't allowed by ORM.
            rbg.remove();
            return 
        }
        var popboxes = rbg.datum().boxes;
        var boxes = [...rbgroup.datum().boxes];
        if ( rbgroup.datum().flipped ){ boxes.reverse() }
        var rotate = false
        if ( rbgroup.datum().rotated ) {
            // Undo rotatation before adding uniqueness constraints
            rotate = true;
            //rotate_rolebox_group(rbgroup);
            predicates[rbgroup.attr("id")].rotate();
        }
        for (var n in boxes) {
            var rbox = d3.select("#"+boxes[n]);
            rbox.datum().multiplicity = d3.select("#"+popboxes[n]).datum().multiplicity;
            ormjs.Rolebox.set_rolebox_iuc(rbox);
        }
        if ( rotate ) {
            // re-rotate if rotated
            //rotate_rolebox_group(rbgroup);
            predicates[rbgroup.attr("id")].rotate();
        }
        rbg.remove();
    }

    static split_role_name(namestring) {
        // Split the single string value entered for the 1st two roleboxes into names
        // for each rolebox.
        var names = namestring.split(" ")
        if (names.length == 1) { return [namestring, ""] }
        if (names.length == 2) { return names }
        var name1 = names.splice(0,names.length-1).join(" ")
        var name2 = names[names.length-1]
        return [name1, name2]
    }

    static update_name(object) {

        /* Using the object's datum, set the visualization of
        the name. */

        var objects = ormjs.models[object.datum().model].objects;
        var kind = object.datum().kind;

        if (["entity","value","rolebox_group"].includes(kind)) {
            objects[kind][object.attr("id")].update_display_name();
        }

        /*if (object.datum().kind == "entity") {
            orm.entities[object.attr("id")].update_display_name();
        }
        if (object.datum().kind == "value") {
            orm.values[object.attr("id")].update_display_name();
        }
        if (object.datum().kind == "rolebox_group") {
            orm.rbgroups[object.attr("id")].update_display_name();
        }*/
    }

    /* Forms */

    static entity_form(entity) {

        /* Define the form for changing entity properties. */

        // Get the datum to fill in current values for properties
        var d = entity.datum();
        var entityID = entity.attr("id");
        var entities = ormjs.models[d.model].objects.entity;
        // Set html for displaying independent object status
        var ch = "";
        if (d.independent) { ch = `checked="checked"`; }
        if ( !entities[entityID].check_independence() ) { ch += ` disabled="disabled"`; }
        // Set html for displaying reftype
        var reftype = { "popular": "", "general": "", "unit": "" };
        reftype[d.reftype] = `checked="checked"`;

        // Return form
        return `
        <div class="ormjs-popup_form">
        <h1>Entity</h1>
            <table class="form_table">
            <tr>
            <!-- Name -->
            <td class="ormjs-popup-left_col"><label for="fname">Name</label></td>
            <td class="ormjs-popup-right_col"><input type="text" id="name-${entityID}" name="name" value="${d.name}" ${focus} /></td>
            </tr>
            <tr>
            <!-- Independent ? -->
            <td class="ormjs-popup-left_col"></td>
            <td class="ormjs-popup-right_col_small"><input type="checkbox" id="independent-${entityID}" name="independent" value="${d.independent}" ${ch} />Independent</td>
            </tr>
            <tr>
            <!-- Reference Mode -->
            <td class="ormjs-popup-left_col"><label for="lname">Ref. mode</label></td>
            <td class="ormjs-popup-right_col"><input type="text" id="refmode-${entityID}" name="refmode" value="${d.refmode}" /></td>
            </tr>
            <tr>
            <!-- Reference Type -->
            <td class="ormjs-popup-left_col"></td>
            <td class="ormjs-popup-right_col_small">
            <input type="radio" id="rtpopular-${entityID}" name="reftype" value="popular" ${reftype["popular"]}>Popular
            <input type="radio" id="rtunit-${entityID}" name="reftype" value="unit" ${reftype["unit"]}>Unit
            <input type="radio" id="rtgeneral-${entityID}" name="reftype" value="general" ${reftype["general"]}>General
            </td>
            </tr>
            </table>
        </div>
        `
    }

    static value_form(value) {

        /* Define the form for changing value properties. */

        var d = value.datum();
        var valueID = value.attr("id");
        var values = ormjs.models[d.model].objects.value;
        var ch = ""
        if (d.independent) { ch = `checked="checked"`}
        if ( !values[valueID].check_independence() ) { ch += ` disabled="disabled"`; }
        return `
        <div class="ormjs-popup_form">
        <h1>Value</h1>
            <table class="form_table">
            <tr>
            <td class="ormjs-popup-left_col"><label for="fname">Name</label></td>
            <td class="ormjs-popup-right_col"><input type="text" id="name-${valueID}" name="name" value="${d.name}" /></td>
            </tr>
            <tr>
            <!-- Independent ? -->
            <td class="ormjs-popup-left_col"></td>
            <td class="ormjs-popup-right_col_small"><input type="checkbox" id="independent-${valueID}" name="independent" value="${d.independent}" ${ch} />Independent</td>
            </tr>
            </table>
        </div>
        `
    }

    static fact_form(rbgroup) {

        /* Define the form for changing Fact properties. (ie, rolebox groups) */

        // Need to know how many roleboxes are in the group to display fields
        // for name change and uniqueness constraints.
        var gd = rbgroup.datum();
        var boxes = [...gd.boxes];
        // Display the boxes unflipped for clarity
        if (gd.flipped) { boxes.reverse(); }
        var d = d3.select("#"+boxes[0]).datum();
        var rname = d.name;
        // The first name box includes the names of the first two boxes.
        // Because ORM is like that...sigh.
        if (boxes.length > 1) {
            d = d3.select("#"+boxes[1]).datum();
            if (d.name.length > 0 ) { rname += " " + d.name; }
        }
        // Set the form for the first 2 boxes
        var form_html = `
        <div class="ormjs-popup_form">
        <h1>Fact</h1>
            <table class="form_table">
            <tr>
            <td class="ormjs-popup-left_col"><label for="fname">Name</label></td>
            <td class="ormjs-popup-right_col"><input type="text" id="name-${boxes[0]}" name="name" value="${rname}" /></td>
            </tr>`;
        // Set the form for additional boxes
        if (boxes.length > 2) {
            var rng = ormjs.GraphUtils.range(boxes.length-2,2);
            for ( var n in rng ) {
                d = d3.select("#"+boxes[ rng[n] ]).datum();
                form_html += 
                `<tr>
                <td class="ormjs-popup-left_col"><label for="lname">...</label></td>
                <td class="ormjs-popup-right_col"><input type="text" id="name-${boxes[ rng[n] ]}" name="name" value="${d.name}" /></td>
                </tr>`
            }
        }
        // Set the form for the reverse name
        form_html += `
            <tr>
            <td class="ormjs-popup-left_col"><label for="fname">Rev. Name</label></td>
            <td class="ormjs-popup-right_col"><input type="text" id="rname-${rbgroup.attr("id")}" name="rname" value="${gd.rname}" /></td>
            </tr>`
        // Set the uniqueness constraints
        // We define the SVG field here, but we populate it separately.
        //if ( boxes.length > 1 ) {
        var svgwidth = (boxes.length+1)*ormjs.size.rolebox.width;
        var svgheight = 2*ormjs.size.rolebox.height;
        var svgid = "popsvg-"+rbgroup.attr("id");
        form_html +=`
            <tr>
            <td colspan="2" class="ormjs-centered"><label>Uniqueness Constraints</label></td>
            </tr>
            <tr>
            <td colspan="2" class="ormjs-centered"><svg id="${svgid}" width="${svgwidth}" height="${svgheight}"></svg></td>
            </tr>
            `
        //}
        form_html +=`
            </table>
        </div>
        `;

        return form_html
    }

    static popup_rbgroup(rbgroup) {
        /* 
        Create the rolebox group that appears in the rolebox menu. This
        is how uniqueness constraints are set.
        */
        var x = ormjs.size.rolebox.width;
        var y = ormjs.size.rolebox.height*1.2;
        var rbgID = "pop-rbg-"+rbgroup.attr("id");
        if ( d3.select("#popsvg-"+rbgroup.attr("id")).empty() ) { return }
        var rbg = d3.select("#popsvg-"+rbgroup.attr("id")).append("g")
            .datum( {x: x, y: y, dx: 0, dy: 0, x0: x, y0: y,
                    boxes: []} )
            .attr("class", "ormjs-rolebox_group ormjs-poprbg")
            .attr("id", rbgID)
            .attr("x", -ormjs.size.rolebox.width/2 )
            .attr("y", -ormjs.size.rolebox.height/2 );
        var boxes = [...rbgroup.datum().boxes];
        if ( rbgroup.datum().flipped ){ boxes.reverse() }
        for (var n in boxes) {
            // Create box
            var d3rbox = ormjs.Rolebox.draw_box({predicate: {d3object: rbg}})
            // Set initial uniqueness constraint to match rbgroup
            d3rbox.datum().multiplicity = d3.select("#"+boxes[n]).datum().multiplicity;
            d3rbox.datum().uclist = ormjs.PropertyMenu.available_uconstraints(n, boxes.length);
            ormjs.Rolebox.set_rolebox_iuc(d3rbox);
            d3rbox.on("click", ormjs.PropertyMenu.rotate_uconstraint);
        }
        ormjs.PropertyMenu.allowed_uc_combination(rbg);
    }

    static rotate_uconstraint(event,d) {

        /* Select the next uniqueness constraint to display above the rolebox.
        Each rolebox has a list of uniqueness constraints that can be applied,
        Set by available_uconstraints. 
        
        This function selects the next in the list and displays it above the 
        rolebox in the property menu when the rolebox is clicked. */

        var rbox = d3.select(this);
        var ind = d.uclist.indexOf(d.multiplicity);
        d.multiplicity = d.uclist[ (ind+1) % d.uclist.length ];
        ormjs.Rolebox.set_rolebox_iuc(rbox);
        ormjs.PropertyMenu.allowed_uc_combination(d3.select("#"+rbox.datum().parent));
    }

    static available_uconstraints(n,total) {
        var mult_param = ormjs.Rolebox.multiplicity();
        var av = []
        if (n < total-1 && total > 1) {
            n == 0 ? av = [mult_param.none,mult_param.one,mult_param.many] : 
                    av = [mult_param.none,mult_param.one,mult_param.many,mult_param.skip]
        }
        if (n == total-1) {
            av = [mult_param.none,mult_param.one,mult_param.many];
        }
        if (total == 1) {
            av = [mult_param.none,mult_param.one];
        }
        return av
    }

    static allowed_uc_combination(rbg) {
        /* 
        Check if the uniqueness constraint is allowed by ORM rules.
        If not, highlight in red by classing to "notparsed"
        */
        var rbgID = rbg.attr("id");
        // Check each rolebox for its multiplicity
        var boxes = [...rbg.datum().boxes];
        var uclist = [];
        for (var n in boxes) {
            uclist.push( d3.select("#"+boxes[n]).datum().multiplicity );
        }
        // Get the count of each multiplicity type
        var uccnt = {};
        var mult_param = ormjs.Rolebox.multiplicity();
        uccnt[mult_param.none] = 0;
        uccnt[mult_param.one] = 0;
        uccnt[mult_param.many] = 0; 
        uccnt[mult_param.skip] = 0;
        
        uccnt = uclist.reduce(
            function (acc, curr) {
                return acc[curr] ? ++acc[curr] : acc[curr] = 1, acc
            }, uccnt);
        var total = boxes.length;
        
        // Here are the ORM rules
        // Integrity constraints must appear over total-1
        if ( ( uccnt[mult_param.many] > 0 && uccnt[mult_param.many] < total-1 ) ||
            ( uccnt[mult_param.one] > 0 && uccnt[mult_param.one] < total-1 ) ||
            ( uccnt[mult_param.skip] > 0 && uccnt[mult_param.none] > 0 ) ||
            ( uccnt[mult_param.skip] > 1 ) ||
            ( uccnt[mult_param.many] > 0 && uccnt[mult_param.many] != total && total == 2 ) ) {
            ormjs.Graph.class_as(rbgID,"ormjs-notparsed");
            return
        }
        ormjs.Graph.unclass_as(rbgID,"ormjs-notparsed");
    }

    /* Constraint */

    static constraint_form(d3constraint) {

        /* Define the form for changing Constraint properties.*/

        var d = d3constraint.datum();

        var popwidth = ormjs.size.popup.width;
        var popheight = ormjs.size.popup.height;

        var constID = d3constraint.attr("id");
        var svgid = "popsvg-"+constID;
        var svgwidth = popwidth*0.8;
        var svgheight = popheight*0.6;
        var form_html = `
        <div class="ormjs-popup_form">
        <h1>Constraint</h1>
            <table class="form_table">
            <tr>
            <td class="ormjs-popup-left_col"><label for="fname">Type</label></td>
            <td class="ormjs-popup-right_col"><input type="text" id="type-${constID}" 
                name="type" value="${d.type}" lastvalue="${d.type}" readonly disabled /></td>
            </tr>
            `;
        form_html += `<tr id="value-row-${constID}" class="value-row">
            <td class="ormjs-popup-left_col"><label for="fcontent">Value</label></td>
            <td class="ormjs-popup-right_col"><input type="text" id="content-${constID}" 
                name="content" value="${d.content}" /></td>
            </tr>
            <tr id="helper-row-${constID}" class="value-row">
            <!-- Helper -->
            <td class="ormjs-popup-left_col"></td>
            <td class="ormjs-popup-right_col_small ormjs-warning">Ex: "1.5", ">=2", "[1..10)", "1..5"</td>
            </tr>
        `;
        form_html += `
            <tr>
                <td colspan="2" class="ormjs-centered">
                <div height="${svgheight}" style="overflow-y:auto">
                <svg id="${svgid}" width="${svgwidth}" height="${svgheight}" class="ormjs-popsvg"></svg>
                </div>
                </td>
            </tr>
            </table>
        </div>
        `;

        return form_html
    }

    static popup_constraint(d3constraint) {
        /* 
        Create the rolebox group that appears in the rolebox menu. This
        is how uniqueness constraints are set.
        */

        var id = d3constraint.attr("id");
        if ( d3.select("#popsvg-"+id).empty() ) { return }
        var current_type = d3constraint.datum().type;
        ormjs.PropertyMenu.contraint_value_viz(id,current_type);

        // Dimensions
        var d = 2*ormjs.size.constraint.radius;
        var str = ormjs.size.constraint.stroke;

        // Spacing
        var typeiter = {};
        var dx = 0.25*d;  // margin around box
        var w = 1.5*d; // width of box around constraint
        var nwide = 4; // Number of contraints per row
        var supported = ormjs.Constraint.supported_types().list;

        // Set svg size appropriately
        var nhigh = Math.ceil(supported.length/nwide);
        d3.select("#popsvg-"+id)
            .attr("width", (2*dx + w)*nwide)
            .attr("height", (2*dx + w)*nhigh);
        
        // Get positions
        var n = 0;
        var m = -1;
        var p = 0;
        supported.map( (type) => {
            p = n % nwide;
            if (p == 0) { m += 1};
            typeiter[type] = {x: dx+(2*dx + w)*p, y: dx+(2*dx + w)*m };
            n += 1;
        });

        // Create constraints
        supported.map( (type) => {
            // Get location
            var pos = typeiter[type];
            // ID for option
            var co_id = `pop-cg-${id}-${type}`;
            // Draw constraint group
            var content = "";
            if (type == "external-frequency" || type == "internal-frequency") { content = ">2"; }
            if (type == "subset") { content = "⊆"; }
            var constraint_option = d3.select("#popsvg-"+id).append("g")
                .datum( { x: pos.x, y: pos.y, dx: pos.x, dy: pos.y, 
                        x0: 0, y0: 0, content: content,
                        selected: false, connectors: [],
                        kind: "constraint", type: type,
                        deontic: false } )
                .attr("class", "ormjs-constraint_prototype ormjs-poprbg")
                .attr("width", d) // This determines default constraint radius
                .attr("height", d)
                .attr("id", co_id);
            // Add rectangle used for highlighting
            var mark_current = "";
            if (type == current_type) { mark_current = " selected" }
            constraint_option.append("rect")
                .attr("class", `ormjs-constraint_box${mark_current}`)
                .attr("id", `r-${co_id}`)
                .attr("width", w)
                .attr("height", w)
                .attr("transform", () => ormjs.Graph.translate(-w/2,-w/2));
            // Draw the constraint itself
            ormjs.Constraint.draw_constraint(constraint_option);

            d3.select(`#pop-cg-${id}-${type}`)
                .attr("transform", () => ormjs.Graph.translate(pos.x+w/2+str,pos.y+w/2+str));
        });

        // Actions
        var drag_form = d3.drag()
            .on("start", (event) => { event.sourceEvent.stopPropagation(); });
        supported.map( (type) => {
            var cptype = (' ' + type).slice(1);
            d3.select(`#pop-cg-${id}-${cptype}`)
                // Highlight on mouseover
                .on("mouseover", (event) => {
                    var targetID = event.target.id.toString();
                    if (targetID == null) {return}
                    //targetID = targetID.slice(2,targetID.length);
                    targetID = ormjs.Graph.levelupID(targetID);
                    ormjs.Graph.class_as(`r-${targetID}`,"hovered");
                    document.getElementById(`type-${id}`).lastvalue =
                        document.getElementById(`type-${id}`).value;
                    document.getElementById(`type-${id}`).value = 
                        d3.select(`#${targetID}`).datum().type;
                } )
                // Unhighlight on mouseout
                .on("mouseout", (event) => {
                    var targetID = event.target.id.toString();
                    if (targetID == null) {return}
                    targetID = ormjs.Graph.levelupID(targetID);
                    ormjs.Graph.unclass_as(`r-${targetID}`,"hovered");
                    document.getElementById(`type-${id}`).value = 
                        document.getElementById(`type-${id}`).lastvalue;
                } )
                // Select on click and adjust highlighting on all rects
                .on("click", (event) => {
                    var targetID = event.target.id.toString();
                    if (targetID == null) {return}
                    targetID = ormjs.Graph.levelupID(targetID);
                    supported.map( (t) => { ormjs.Graph.unclass_as(`r-pop-cg-${id}-${t}`,"selected"); } );
                    ormjs.Graph.class_as(`r-${targetID}`,"selected");
                    document.getElementById(`type-${id}`).value = 
                        d3.select(`#${targetID}`).datum().type;
                    document.getElementById(`type-${id}`).lastvalue =
                        document.getElementById(`type-${id}`).value;
                    ormjs.PropertyMenu.contraint_value_viz(id,d3.select(`#${targetID}`).datum().type);
                } )
                // Don't drag menu when clicking on rects
                .call(drag_form);
        });

        // Show helper
        document.getElementById(`content-${id}`).oninput = function() {
            var chk = ormjs.Constraint.valid_frequency_content(document.getElementById(`content-${id}`).value);
            if (chk) {
                document.getElementById(`helper-row-${id}`).style.display = 'none';
            } else {
                document.getElementById(`helper-row-${id}`).style.display = 'table-row';
            }
        }
    }

    static contraint_value_viz(id,type) {
        document.getElementById(`value-row-${id}`).style.display = 'none';
        document.getElementById(`helper-row-${id}`).style.display = 'none';
        if (type == "external-frequency" || type == "internal-frequency") {
            document.getElementById(`value-row-${id}`).style.display = 'table-row';
            document.getElementById(`content-${id}`).focus();
        }
        if (type != "subset" && document.getElementById(`content-${id}`).value == "⊆") {
            document.getElementById(`content-${id}`).value = "";
        }
    }

}
