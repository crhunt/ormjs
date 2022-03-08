/*
    Convert ORM metamodel to Rel code.
*/

// Note: This requires encapsulation in a subsequent PR


/* Globals */
var ormjs;

ormjs.GenerateRel = class {

    static update(modelID) {

        var model = ormjs.models[modelID];

        // Update metamodel
        model.populate_metamodel();
        //var metamodel = ormjs.models[modelID].metamodel;

        // Convert to Rel
        ormjs.GenerateRel.parse( model.metamodel );

        // Display Rel code
        ormjs.GenerateRel.display_rel( model );
        
        // Display XML code
        model.metamodel.display_xml();

        // Display shadows in ORM diagram
        ormjs.Graph.add_shadows(model.metamodel);
    }

    static parse(metamodel) {

        // Add Rel names to ORM metamodel
        ormjs.GenerateRel.metamodel_rel_names(metamodel);

        // Add Rel readings to ORM metamodel
        ormjs.GenerateRel.add_rel_readings(metamodel);

        // Add highlight
        var views = ormjs.models[metamodel.model].objects.view;
        for (var viewID in views) {
            ormjs.RelHighlighter.highlight(views[viewID]);
        }

    }

    /* Add rel names */

    static metamodel_rel_names(metamodel) {
        
        /* Add rel names to the ORM metamodel */

        // Add relnames to objects
        for (var objID in metamodel.Object) {
            //metamodel.Object[objID].set_relname();
            ormjs.GenerateRel.set_relname( metamodel.Object[objID] );
        }

        // Add relnames to facts
        for (var factID in metamodel.Fact) {
            // Add relnames to roles
            metamodel.Fact[factID].FactRoles.map( (role) => { ormjs.GenerateRel.set_relname(role,"role"); } );
            /* Use the role sequence to create a relation name for the reading order
                Each reading will use this relation in a different way to generate
                integrity constraints.*/
            metamodel.Fact[factID].ReadingOrder.map( (ro) => { ormjs.GenerateRel.set_relname(ro,"reading-order"); } );
        }
    }

    static set_relname(obj) {
        if (obj.type == "EntityType") {
            obj._RelName = ormjs.GenerateRel.entity_relname(obj.Name); 
            obj._Atom = ormjs.GenerateRel.entity_atom_relname(obj._RelName, obj.ReferenceMode);
        }
        else if (obj.type == "ValueType") {
            obj._RelName = ormjs.GenerateRel.entity_relname(obj.Name); 
            obj._Atom = ormjs.GenerateRel.value_atom_relname(obj.Name);
        }
        else if (obj.type == "Role") {
            obj._RelName = ormjs.GenerateRel.role_relname(obj.Name);
        }
        else if (obj.type == "ReadingOrder") {
            obj._RelName = ormjs.GenerateRel.reading_order_relname(obj);
        }
    }

    static entity_relname(name) {
        /* From the entity or value name, generate a relname. */
        var relname = name.trim().split(" ").filter(e => e).join("")
                        .replaceAll("-","_").replaceAll(":","");
        return relname
    }

    static entity_atom_relname(name,refmode) {
        /* An atom is the name used to reference a member of the entity type. */
        var relname = name.toLowerCase() + "_" + 
                    refmode.trim().split("_")[0]
                            .replaceAll("-","_").replaceAll(":","");
        return relname
    }

    static value_atom_relname(name) {
        /* An atom is the name used to reference a member of the value type. */
        var relname = name.trim().split(" ")[0].substring(0,3).toLowerCase()
                        .replaceAll("-","_").replaceAll(":","");
        return relname
    }

    static role_relname(name) {
        /* Convert individual role name to a relname */
        var relname = name.trim().split(" ").filter(e => e).join("_")
                        .replaceAll("-","_").replaceAll(":","");
        return relname
    }

    static reading_order_relname(ro) {
        
        /* Convert roleboxes into a relation name. 
        
        This looks more complicated than it is because we allow different naming
        conventions for relnames. The 4 conventions are:
        1. (shortFormat = T, graphFormat = F) Use rolebox names as relation names
        2. (shortFormat = T, graphFormat = T) Use entity names as relation names, with modules
        3. (shortFormat = F, graphFormat = T) Use entity names and rolebox names as relation 
            names, with modules
        4. (shortFormat = F, graphFormat = F) Use entity names and rolebox names as relation 
            names, with underscores connecting the names (...Don't do this one. Ew.)
        */
        
        // Module notation?
        var c;
        ormjs.display.graphFormat ? c = ":" : c = "_";

        var metamodel = ormjs.models[ro.model].metamodel;
        

        // Get roles
        var factID = ro._factID;
        var boxes = ro.RoleSequence;
        var factroles = metamodel.Fact[factID].FactRoles;
        
        // Add first role, single box
        // Rules here are a little different to conform to shadowing rules.
        // (The shortFormat + graphFormat case is different--we use Entity:role notation rather
        //  than just Entity, since the latter wouldn't make sense!)
        if (boxes.length == 1) {
            if (factroles[boxes[0]].RolePlayer == null) { return false }
            var rplayer = metamodel.Object[ factroles[boxes[0]].RolePlayer ]._RelName;
            var role = metamodel.Fact[factID].FactRoles[boxes[0]]._RelName;
            if (ormjs.display.graphFormat || !ormjs.display.shortFormat) { return `${rplayer}${c}${role}` }
            else { return role }
        }

        // Convert format choices into whether to include rolebox names and entity names
        // in fact relation name.
        var inclEntity = true;
        var inclBox = true;
        if (ormjs.display.shortFormat && ormjs.display.graphFormat) { inclBox = false; }
        else if (ormjs.display.shortFormat && !ormjs.display.graphFormat) { inclEntity = false; }

        // Add first role
        var relname = ``;
        if (factroles[boxes[0]].RolePlayer == null) { return false }
        var rplayer = metamodel.Object[ factroles[boxes[0]].RolePlayer ]._RelName;
        if(inclEntity) { relname = `${rplayer}`; }
        if (inclBox) { 
            if (inclEntity) { relname += `${c}`; }
            relname += `${metamodel.Fact[factID].FactRoles[boxes[0]]._RelName}`; 
        }
        
        // Add second role
        if ( metamodel.Fact[factID].FactRoles[boxes[1]]._RelName.length > 0 ) {
            if (inclBox) { relname += `_${metamodel.Fact[factID].FactRoles[boxes[1]]._RelName}`; }
        }
        if (factroles[boxes[1]].RolePlayer == null) { return false }
        rplayer = metamodel.Object[ factroles[boxes[1]].RolePlayer ]._RelName;
        if (inclEntity) { relname += `${c}${rplayer}`; }
        
        // Add additional roles
        var rng = ormjs.GraphUtils.range(boxes.length-2,2);
        for ( var n in rng ) {
            if (inclBox) { relname += `${c}${metamodel.Fact[factID].FactRoles[boxes[rng[n]]]._RelName}`; }
            //rplayer = entity_relname_from_role(factroles[boxes[rng[n]]]);
            if (factroles[boxes[ rng[n] ]].RolePlayer == null) { return false }
            rplayer = metamodel.Object[ factroles[boxes[ rng[n] ]].RolePlayer ]._RelName;
            if (inclEntity) { relname += `${c}${rplayer}`; }
        }
        return relname
    }

    /* Add Rel code readings */

    static add_rel_readings(metamodel) {

        for (var factID in metamodel.Fact) {
            metamodel.Fact[factID].ReadingOrder.map( (ro) => {
                ro.Reading.map( (reading) => { reading.set_rel_reading(); } );
            } );
            metamodel.Fact[factID].fill_readings();
        }
    }

    static add_NaryForwardReading(reading) {

        /* Convert an ORM reading of an n-ary rolebox fact into Rel code */

        var metamodel = ormjs.models[reading.model].metamodel;

        // Get fact relation name
        var factID = reading._factID;
        var ronum = reading._ronum;
        var relname = metamodel.Fact[factID].ReadingOrder[ronum]._RelName;
        if (!relname) { return }
        var id;
        ormjs.display.graphFormat ? id = ":id" : id = "";

        // Create subset relation with all members of each entity, 
        // ordered by the arity of relname.
        var roleseq = metamodel.Fact[factID].ReadingOrder[ronum].RoleSequence;
        var rolestring = roleseq.map( e => `{${e}}${id}` ).join(", ");

        // If relname is shadowed, we need to extend subset relation.
        var relcode = [];
        if( metamodel.Fact[factID]._Shadows.length > 1 ) {
            /* Relation is shadowed. Therefore we need an extendable relation
            definition to handle the space of allowed entity and value types
            in the relation. We define subset_relation as an inline relation
            that covers this space. */
            //var subset_relation = `allowed_${relname.replaceAll(":","_")}`;
            var subset_relation = `allowed_${relname}`;
            relcode.push(`ic { ${relname} ⊆ ${ subset_relation } }`);
            relcode.push(`@inline def ${subset_relation} = (${ rolestring })`);
        } else {
            relcode.push(`ic { ${relname} ⊆ (${ rolestring }) }`);
        }

        reading._RelData = relcode;
    }

    static add_MandatoryForwardReading(reading) {

        var metamodel = ormjs.models[reading.model].metamodel;

        // Get mandatory role
        var rolen = reading.ExpandedData[0].RoleIndex;
        // Get fact relation name
        var relname = metamodel.Fact[reading._factID].ReadingOrder[reading._ronum]._RelName;
        if (!relname) { return }
        var id;
        ormjs.display.graphFormat ? id = ":id" : id = "";

        // Get total number of roles
        var total_roles = metamodel.Fact[reading._factID].ReadingOrder[reading._ronum]
                                .RoleSequence.length;

        var relstring = "";
        if (total_roles == 2) {
            // Binary
            rolen == 0 ? relstring = `ic { total({${rolen}}${id}, ${relname}) }` 
                    : relstring = `ic { total({${rolen}}${id}, transpose[${relname}]) }`;
        } else {
            // Nary
            var atom = `{a${rolen}}`; // Get atom of role player
            var position = "_,".repeat(rolen) + atom + ",_".repeat(total_roles - rolen - 1);
            var relstring = `ic { {${rolen}}${id}(${atom}) implies ${relname}(${position}) }`;
        }

        reading._RelData = [relstring];

    }

    /* Display Rel code */

    static generate_codeblock(model) {
        // Rel code block

        var code_group = {};

        // Group facts by primary entity
        var fact_groups = ormjs.GenerateRel.facts_by_entity(model.metamodel);
        for ( var objID in fact_groups ) {
            // Add statements for entity objID
            fact_groups[objID]["facts"].map( (ro) => {
                ro.Reading.map( (reading) => {
                    if (reading._Statement != null) {
                        code_group[objID] = {};
                        code_group[objID][reading._Statement] = reading._RelStatement;
                    }
                } );
            } );
        }

        return code_group
    }

    static flatten_codeblock(code_group, model) {

        var statements = [];
        for ( var objID in code_group ) {
            for ( var sentence in code_group[objID] ) {
                if( code_group[objID][sentence].length > 0 ) {
                    statements.push(`/* ${model.metamodel.Object[objID].Name} */`);
                    statements.push(`// ${sentence}`);
                    statements.push.apply(statements, code_group[objID][sentence]);
                }
            }
        }
        // Filter statement in case of duplicates, keep first
        statements = statements.filter(function(item, pos) {
            return statements.indexOf(item) == pos;
        });

        return statements
    }

    static display_rel(model) {

        var code_block = ormjs.GenerateRel.generate_codeblock(model);
        var code_list = ormjs.GenerateRel.flatten_codeblock(code_block, model);
        var relcode = code_list.join("\n");
        relcode = relcode.replaceAll("\n/*","\n\n/*").replaceAll("*/\n","*/\n\n");

        // Display
        d3.select(`#${model.rel_target}`).html(`<pre><code class="language-js">${relcode}</code></pre>`);

    }

    static facts_by_entity(metamodel) {
        
        /* Group facts by primary entity */

        var fact_groups = {};
        for ( var factID in metamodel.Fact ) {
            metamodel.Fact[factID].ReadingOrder.map( (ro) => {
                var objID = ro._FirstEntity;
                if ( objID != null ) {
                    objID in fact_groups ? fact_groups[objID]["facts"].push(ro)
                                         : fact_groups[objID] = { "facts": [ro] };
                }
            } );
        }
        return fact_groups
    }

}

/* Highlight unparsed objects */

ormjs.RelHighlighter = class {
    
    static highlight(view) {

        var in_view = view.objects_in_view();
        var objects = ormjs.models[view.model].objects;
        var hlobjects = ["entity", "value", "connector",
                         "rolebox", "constraint"];
        
        hlobjects.map( (obj) => {
            for ( var objID  in objects[obj] ) {
                if ( in_view.includes( ormjs.Graph.get_parentID(objID) ) ) {
                    ormjs.RelHighlighter.class_as_notparsed(objID,view);
                }
            }
        });
    
        // Find internal UCs that are not parsed
        for ( var boxID in objects.rolebox ) {
            if (in_view.includes( ormjs.Graph.get_parentID(boxID) )) {
                ormjs.RelHighlighter.class_as_notparsed("c-"+boxID,view);
            }
        }
    }
    
    static class_as_notparsed(anyID,view) {
        ormjs.Graph.unclass_as(anyID, "notparsed");
        var metamodel = ormjs.models[view.model].metamodel;
        if ( ! metamodel.relIDs.includes(anyID) && view.highlight ) {
            ormjs.Graph.class_as(anyID, "notparsed");
        }
    }
}
