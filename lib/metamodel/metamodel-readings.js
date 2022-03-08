/* Readings and Reading Orders */

ormjs.Reading = class {
    
    id;
    model;
    type = "Reading";
    Data = null;
    ExpandedData = [];
    _rbgID;
    _factID;
    _roID;
    _rnum;
    _ronum;
    _ReadingType = null;
    _RelData = [];
    _Statement = null;
    _RelStatement = [];
    _includedIDs = [];
    XML = "";

    constructor(n,ro) {
        this.id = `${ro._factID}-reading-${n.toString()}`;
        this.model = ro.model;
        this._rbgID = ro._rbgID;
        this._factID = ro._factID;
        this._roID = ro.id;
        this._rnum = n;
        this._ronum = ro._ronum;
    }

    set_reading(readingtype, rolen = 0) {

        /* For reading readingtype, add the data for the reading. */

        this._ReadingType = readingtype;
        if (this._ReadingType == "NaryForwardReading") {
            this.forward_reading();
        }
        else if (this._ReadingType == "MandatoryForwardReading") {
            this.mandatory_reading(rolen);
        }
    }

    toXML() {

        /* Add XML representation of the Reading */

        var t = "    ";
        this.XML = `<orm:Reading id="${this.id}">\n`;
        this.XML += `${t}<orm:Data>${this.Data}</orm:Data>\n`;
        this.XML += `${t}<orm:ExpandedData>\n`;
        this.ExpandedData.map( (e) => { 
            this.XML += `${t}${t}<orm:RoleText RoleIndex="${e.RoleIndex}" FollowingText="${e.FollowingText}" PrecedingText="${e.PrecedingText}" />\n`; 
        } );
        this.XML += `${t}</orm:ExpandedData>\n`;
        this.XML += `</orm:Reading>`;
    }

    /* Functions related to parsing to Rel
       Function definitions in parse-to-rel.js. */

    set_rel_reading() {
        // Forward Reading
        if ( this._ReadingType == "NaryForwardReading" ) { 
            ormjs.GenerateRel.add_NaryForwardReading(this); 
        }
        // Mandatory Reading
        if ( this._ReadingType == "MandatoryForwardReading" ) { 
            ormjs.GenerateRel.add_MandatoryForwardReading(this); 
        }
        // Internal UC Reading
    }

    /* Readings */

    forward_reading() {

        /* This is the most basic reading of n-ary facts.  */
        
        // Get ordered list of roles
        var metamodel = ormjs.models[this.model].metamodel;
        var factroles = metamodel.Fact[this._factID].FactRoles;
        var rs = metamodel.Fact[this._factID].ReadingOrder[this._ronum].RoleSequence;
    
        // Get all included IDs
        var includedIDs = rs.map( e => factroles[e]._rboxID );
        includedIDs.push(this._rbgID);
        // Only connections to entities that are not mandatory
        var connIDs = rs.map( (e) => {
            var connID;
            factroles[e].IsMandatory ? connID = null 
                                     : connID = ormjs.Graph.any_object(factroles[e]._rboxID).entity_connector();
            return connID          
        } ).filter(v => v);
        includedIDs.push.apply(includedIDs,connIDs);
    
        // Add data for reading
        var d = ormjs.Reading.sequence_reading(rs, metamodel.Fact[this._factID]);
        
        // Organize as a Reading
        this.Data = d.data;
        this.ExpandedData = d.expanded_data;
        this._ReadingType = "NaryForwardReading";
        this._includedIDs = includedIDs;
    
    }

    mandatory_reading(rolen) {

        // Get basic forward reading, if it exists.
        var metamodel = ormjs.models[this.model].metamodel;
        var fwd_reading = metamodel.Fact[this._factID].ReadingOrder[this._ronum].Reading[0];
        if (! fwd_reading._ReadingType == "NaryForwardReading" ) { return }
    
        // Get included IDs
        var includedIDs = [...fwd_reading._includedIDs];
        // Connect to mandatory entity
        var rbID = metamodel.Fact[this._factID].FactRoles[rolen]._rboxID;
        includedIDs.push( ormjs.Graph.any_object(rbID).entity_connector() );
    
        // Mandatory reading extends basic forward reading.
        var data = `For every {${rolen}}, ${fwd_reading.Data}`;
        var expanded_data = [...fwd_reading.ExpandedData];
        expanded_data.splice(0,0, { RoleIndex: rolen, PrecedingText: "For every", FollowingText: "" });
    
        // Organize as a Reading
        this.Data = data;
        this.ExpandedData = expanded_data;
        this._ReadingType = "MandatoryForwardReading";
        this._includedIDs = includedIDs;
    
    }

    static sequence_reading(rs,fact) {
    
        /* Using a role sequence rs, generate a basic reading through factroles. */
    
        var factroles = fact.FactRoles;
    
        // Add first box
        var data = `\{${rs[0]}\} ${factroles[rs[0]].Name}`; // A string of the reading
        var expanded_data = []; // Broken down as entity indices and text
        expanded_data.push( {RoleIndex: rs[0], 
                             FollowingText: factroles[rs[0]].Name,
                             PrecedingText: ""} );
        
        if( rs.length > 1 ) {
    
            // Add second box (this is separate because may not have name)
            if ( factroles[rs[1]].Name.length > 0 ) {
                data += ` ${factroles[rs[1]].Name}`;
            }
            data += ` \{${rs[1]}\}`;
            expanded_data.push( {RoleIndex: rs[1], 
                                 PrecedingText: factroles[rs[1]].Name,
                                 FollowingText: ""} );
            
            
            // Add additional boxes
            var rng = ormjs.GraphUtils.range(rs.length-2,2);
            for ( var n in rng ) {
                data += ` ${factroles[ rs[rng[n]] ].Name} \{${rs[rng[n]].toString()}\}`
                expanded_data.push( { RoleIndex: rs[rng[n]], 
                                      PrecedingText: factroles[ rs[rng[n]] ].Name,
                                      FollowingText: "" } );
            }
        }
    
        return {data: data, expanded_data: expanded_data }
    
    }

}

ormjs.ReadingOrder = class {
    
    id;
    model;
    type = "ReadingOrder";
    Reading = [];
    RoleSequence = [];
    _rbgID;
    _factID;
    _ronum;
    _FirstEntity = null;
    _RelName = null;
    XML = "";
    

    constructor(n,fact) {
        this.id = `${fact.id}-reading-order-${n.toString()}`;
        this.model = fact.model;
        this._factID = fact.id
        this._rbgID = fact._rbgID;
        this._ronum = n;
    }

    set_sequence(direction) {
        if(direction == "forward") { this.forward(); }
    }

    toXML() {

        /* Add XML representation of the Reading Order */

        var metamodel = ormjs.models[this.model].metamodel;

        var t = "    ";
        this.XML = `<orm:ReadingOrder id="${this.id}">\n`;
        this.XML += `${t}<orm:Readings>\n`;
        // Readings
        this.Reading.map( (e) => {
            e.toXML();
            var xml = (' ' + e.XML).slice(1); // Deep copy
            xml = xml.replaceAll(`\n`,`\n${t.repeat(2)}`); // Indent
            this.XML += `${t.repeat(2)}${xml}\n`; // Add to model
        } );
        this.XML += `${t}</orm:Readings>\n`;
        // RoleSequence
        var factroles = metamodel.Fact[this._factID].FactRoles;
        this.XML += `${t}<orm:RoleSequence>\n`;
        this.RoleSequence.map( (e) => {
            this.XML += `${t}${t}<orm:Role ref="${factroles[e].id}" />\n`;
        } );
        this.XML += `${t}</orm:RoleSequence>\n`;
        this.XML += `</orm:ReadingOrder>`;
    }

    /* Functions related to parsing to Rel
       Function definitions in parse-to-rel.js. */
    
    set_relname() { this._RelName = reading_order_relname(this); }

    /* Reading Orders */

    forward() {

        /* Create all readings that use the forward reading order. */
    
        // Get ordered list of roles
        var metamodel = ormjs.models[this.model].metamodel;
        var factroles = metamodel.Fact[this._factID].FactRoles;
        this.RoleSequence = [...factroles.keys()];
        this._FirstEntity = factroles[0].RolePlayer;
        
        // Basic reading (no constraints)
        var rnum = 0;
        var r = new ormjs.Reading(rnum, this);
        r.set_reading("NaryForwardReading");
        this.Reading.push(r);
        rnum += 1;
        
        // Mandatory constraints
        for (var n in factroles) {
            if( factroles[n].IsMandatory ) {
                var rmand = new ormjs.Reading(rnum, this);
                this.Reading.push(rmand);
                rmand.set_reading("MandatoryForwardReading",rolen=n);
                rnum += 1;
            }
        }
        
        // Uniqueness constraints
        // TO DO
        
    }

}
