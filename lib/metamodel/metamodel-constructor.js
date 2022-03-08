/*
    Define and populate the metamodel.
 */

/* Globals */

var ormjs;

ormjs.Metamodel = class {
    id; // ID scheme in place in case we ever support multiple models
    model;
    Object = {};
    Fact = {};
    SubtypeFact = {};
    Constraint = {};
    relIDs = [];
    XML = "";
    m2mm =  {};

    constructor(model) {
        this.model = model;
        this.id = `meta-${model}`;
    }

    add_entity(n,entity) {
        var en = new ormjs.EntityType(n, entity);
        this.m2mm[entity.id] = en.id;
        this.Object[en.id] = en;
    }

    add_value(n,value) {
        var val = new ormjs.ValueType(n, value);
        this.m2mm[value.id] = val.id;
        this.Object[val.id] = val;
    }

    add_fact(n,rbgroup) {
        var f = new ormjs.Fact(n,rbgroup);
        // Add link between rbgroup and fact
        this.m2mm[rbgroup.id] = f.id;
        f.FactRoles.map( (role) => { this.m2mm[role._rboxID] = role.id; });
        // Add to metamodel
        this.Fact[f.id] = f;
        f.populate_shadows();
        f.populate_reading_orders();
    }

    add_objects(objects,kind="EntityType") {
        
        // Add all objects
        var n = Object.keys(this.Object).length;
        for (var objID in objects ) {
            var matchID = this.find_object(objects[objID]);
            if (!matchID) {
                kind == "EntityType" ? this.add_entity(n,objects[objID])
                                     : this.add_value(n,objects[objID]);
                n += 1;
            } else {
                // Match found
                this.m2mm[objID] = matchID;
                this.Object[matchID].extend( objects[objID] );
            }
        }

        // For kind="ValueType": Need to add refmode from entities
        // TO DO
    }

    add_facts(predicates) {
        // Add facts (based on rolebox groups)
        var n = 0;
        for( var rbgID in predicates ) {
            this.add_fact(n, predicates[rbgID]);
            n += 1;
        }

        // Update object played roles
        for ( var objID in this.Object ) {
            this.Object[objID].PlayedRoles = 
                this.Object[objID].PlayedRoles.map( e => this.m2mm[e] );
        }

        // Add subtype facts
    }

    find_object(object) {

        /* Check if the ormjs object is already translated into a metamodel
           object.
           
           Two entities are the same if they have the same name, 
           regardless of reference mode! */
        
        var d = object.d3object.datum();
        var kindmatch = { "entity": "EntityType", "value": "ValueType" };
        
        for ( var mmID in this.Object ) {
            if ( this.Object[mmID].Name == d.name &&
                this.Object[mmID].type == kindmatch[d.kind]) {
                return mmID
            }
        }
        return false
    }

    toXML() {
        // Add full model
        var t = "    ";
        this.XML = `<orm:ORMModel>\n`;

        // Add objects
        this.XML += `${t}<orm:Objects>\n`;
        for ( var objID in this.Object ) { 
            this.Object[objID].toXML(); // Add XML to object
            var xml = (' ' + this.Object[objID].XML).slice(1); // Deep copy
            xml = xml.replaceAll(`\n`,`\n${t.repeat(2)}`); // Indent
            this.XML += `${t}${t}${xml}\n`; // Add to model
        }
        this.XML += `${t}</orm:Objects>\n`;
        
        // Add facts
        this.XML += `${t}<orm:Facts>\n`;
        for (var factID in this.Fact ) {
            this.Fact[factID].toXML(); // Add XML to Fact
            var xml = (' ' + this.Fact[factID].XML).slice(1); // Deep copy
            xml = xml.replaceAll(`\n`,`\n${t.repeat(2)}`); // Indent
            this.XML += `${t}${t}${xml}\n`; // Add to model
        }
        this.XML += `${t}</orm:Facts>\n`;

        this.XML += `</orm:ORMModel>\n`;

    }

    find_fact(fact) {
        /* 
        The parameters that have to match depend on whether we are using shortFormat
        and/or graphFormat. The facts "match" if they have the same *fact name*, even if the
        details are different. (Different IUCs, etc.) 
        
        Unlike Objects, "matching" Facts are each added to the metamodel, and _Shadows 
        reference other ormjs rolebox groups with the same fact name. 
        */

        // Get the factroles format for the fact we are checking
        var rbg_factroles = fact.FactRoles;

        /* Determine which values need to match for shadowing
        Note: Shadows have the same fact name but may have other differing information,
                like entities they connect to, constraints, etc. */
        var factlist = [];
        var matchlist = ["Multiplicity", "RolePlayer", "Name"];
        if (shortFormat && graphFormat) { matchlist = ["Multiplicity", "RolePlayer"]; }
        else if (!shortFormat && !graphFormat) { matchlist = ["Multiplicity", "RolePlayer"]; }
        else if (shortFormat && !graphFormat) { matchlist = ["Multiplicity", "Name"]; }
        if (rbg_factroles.length == 1) { matchlist.push("Name"); }

        // JS almost certainly has a less loopy way to write the below...
        /* Check whether each role in the fact has the same values for all the properties in
        matchlist as some fact already in the metamodel.*/
        for (var factID in this.Fact) {
            var factroles = this.Fact[factID].FactRoles;
            var match = true;
            if ( Object.keys(factroles).length == Object.keys(rbg_factroles).length) {
                for (var n in factroles) {
                    /* Each attribute matches */
                    matchlist.map( (attr) => {
                        if(factroles[n][attr] != rbg_factroles[n][attr]) { match = false; }
                    } );
                }
            } else if ( this.Fact[factID]._Name == fact._Name &&
                        matchlist.includes("Name") ) {
                /* If Binary and Unary facts have the same name
                    This works because we set fact._Name to be the rbgroup name!
                    ( This is different from .ORM convention! ) */
                match = true;
            } else { match = false; }
            
            if (match && factID != fact.id) { factlist.push( factID ); }
        }

        return factlist
    }

}
