// 
// ShapeClip API File.
// @author John Hardy
// @author Christian Weichel
// 2014
//
// This contains the code required to drive a ShapeClip device.
// The "Pad" class can be extended for different firmware types.
// 
// This includes John Resig's  'Simple JavaScript Inheritance' code.
// http://ejohn.org/blog/simple-javascript-inheritance/
// 


/**
 * @brief Estimate the device PPI.
 * This works by creating a 1in DIV and measuring the result in pixels.
 * @param iOverride If this value is specified, it overrides the existing ppi value.
 * @return The estimated ppi value for this display.
 */
function __ppi(iOverride) {
	
	// If we are setting it.
	if (iOverride !== undefined)
	{
		window.__ESTIMATED_PPI = iOverride;
		return iOverride;
	}
	
	// If we have it in the cache, return it.
	if (window.__ESTIMATED_PPI !== undefined)
		return window.__ESTIMATED_PPI;
	
	// Create a DIV of 1inch and get the width in pixels.
	var pBody  = document.getElementsByTagName('body')[0];
	var pRuler = document.createElement('div');
	pRuler.style.width = "1in";
	pRuler.style.visibility = "hidden";
	pBody.appendChild(pRuler);
	var iPPI = document.defaultView.getComputedStyle(pRuler, null).getPropertyValue('width');
	pBody.removeChild(pRuler);
	
	// Save and return.
	window.__ESTIMATED_PPI = parseInt(iPPI, 10);
	return window.__ESTIMATED_PPI;
}


/** 
 * @brief Convert a value in mm into pixels on this display.
 * @param mm The number of mm to convert into pixels.
 * @return The mm value in pixels.
 * Note: If you want to override the PPI ratio, call __ppi with a value.
 */
function __px(mm) { return mm * 0.0393700787 * __ppi() }


/* 
 * Simple Javascript Inheritance.
 * @author John Resig (http://ejohn.org/)
 * @license MIT Licensed
 * http://ejohn.org/blog/simple-javascript-inheritance/
 */
(function(){var e=false,t=/xyz/.test(function(){xyz})?/\b_super\b/:/.*/;this.Class=function(){};Class.extend=function(n){function o(){if(!e&&this.init)this.init.apply(this,arguments)}var r=this.prototype;e=true;var i=new this;e=false;for(var s in n){i[s]=typeof n[s]=="function"&&typeof r[s]=="function"&&t.test(n[s])?function(e,t){return function(){var n=this._super;this._super=r[e];var i=t.apply(this,arguments);this._super=n;return i}}(s,n[s]):n[s]}o.prototype=i;o.prototype.constructor=o;o.extend=arguments.callee;return o}})()

/**
 * @brief The Pad defines a place on a screen where a physical shape-changing actuator is placed.
 * A 'settings' parameter (dictionary) is taken by the constructor.
 * It contains a layer (pad.element()) which has the "sc_pad" classname.
 */
var Pad = Class.extend({
	
	
	CLIP_CORNER : true,		// Is the corner clipped off to help with orientation.
	
	/**
	 * @brief Construct this pad.
	 * @param settings The dictionary of arguments.
	 *      settings.width  	- The total width of the pad (px).
	 *      settings.height 	- The total height of the pad (px).
	 *      settings.x   		- The horizontal centre position of the pad from the top-left of the screen (px).
	 *      settings.y   		- The vertical centre position of the pad from the top-left of the screen (px).
	 *      settings.angle   	- The rotation applied to this pad in degrees.  0 degrees is the top of the screen.
	 *      settings.parent     - The parent element within which to add the pad.
	 *      settings.mouserot   - Is mouse rotation on scroll enabled. Boolean, true by default.
	 */
	init: function(settings) {
		
		// Check the DOM is ready.
		if (!(document.readyState == "complete" || document.readyState == "interactive"))
			throw "Page not ready.  Please only create pads when the page is ready.";
		
		// Check for required data.
		if (settings.width === undefined || settings.height === undefined)
			throw "Invalid size.  Specifiy width and height (px).";
		if ((settings.x || 10.00) < 0 || (settings.y || 10.00) < 0)
			throw "Invalid position.  Specify positive numbers (px).";
		
		// Get the parent element.
		var parent = settings.parent || document.body;
		
		// Create a new DOM element layer for this pad's graphics.
		this._element = document.createElement("div");
		this._element.classList.add("sc_pad");
		this._element.style.position = "fixed";
		this._element.style["transform-origin"] = "50% 50%";
		
		if (this.CLIP_CORNER)
		{
			this._element.style["border-top-right-radius"] = "15px";
			this._element.style["overflow"] = "hidden";
		}
		
		parent.appendChild(this._element);
		
		// Configure the pad dimensions.
		this.size(settings.width, settings.height);
		this.position(settings.x, settings.y);
		this.rotate((settings.angle || 0.00) % 360.00);
		this.outline(settings.outline || false);
		
		// Options.
		this.mouseRotate(settings.mouserot || true);
		//this.mouseMove(true);
	},
	
	/**
	 * @brief Delete this pad.
	 */
	remove : function() { 
		
		// Remove the element from the DOM.
		if (this._element)
			this._element.remove();
	},
	
	/**
	 * @brief Get the base DOM node which represents this pad.
	 * @return One DOM node (a 'div') which contains the pad graphics.
	 */
	element : function() {
		return this._element;
	},
	
	/**
	 * @brief Show or hide the dashed outline of this pad.
	 * that is useful for indicating where a shape-changing display should be placed.
	 */
	outline : function(show) {
		if (arguments.length == 1)
		{
			this._outline = show;
			this._element.style["box-sizing"] = "border-box";
			this._element.style["border"] = (show ? "1px dashed white" : "none");
			this._element.style["border-top"] = (show ? "1px dashed cyan" : "none");
			return this;
		}
		return this._outline;
	},
	
	/**
	 * @brief Get/Set the position of this pad (px).
	 * @param x The x position on screen (px) defined by centre point.
	 * @param y The y position on screen (px) defined by centre point.
	 * @return The position structure { x : X, y : Y }, or if parameters are passed, the pad itself.
	 */
	position : function(x, y) {
		
		// If they are given, set width and height.
		if (arguments.length == 2)
		{
			// Update local vars.
			this._x = x;
			this._y = y;
			
			// Update the shape.
			this._element.style.left = (this._x - (this._width  * 0.5)) + "px";
			this._element.style.top  = (this._y - (this._height * 0.5)) + "px";
			
			// Return this pad.
			return this;
		}
		
		// Otherwise return the size.
		return { x : this._x, y : this._y };
	},
	
	/**
	 * @brief Get/Set the size of this pad (px).
	 * @param w The total width on screen (px) for this pad to take up.
	 * @param h The total height on screen (px) for this pad to take up.
	 * @return The size structure { width : X, height : Y }, or if parameters are passed, the pad itself.
	 */
	size : function(w, h) {
		
		// If they are given, set width and height.
		if (arguments.length == 2)
		{
			// Update local vars.
			this._width  = w;
			this._height = h;
			
			// Update the shape.
			this._element.style.width  = this._width  + "px";
			this._element.style.height = this._height + "px";
			
			// Return this pad.
			return this;
		}
		
		// Otherwise return the size.
		return { width : this._width, height : this._height };
	},
	
	/**
	 * @brief Get/Set the rotation applied to this pad (px).
	 * @param degrees The rotation applied to this pad in degrees.  0 degrees is the top of the screen.
	 * @return The angle of this pad, or if parameters are passed, the pad itself. 
	 */
	rotate : function(degrees) {
		
		// If data is given, set it.
		if (degrees !== undefined)
		{
			this._angle = degrees;
			this._element.style["-webkit-transform"] = "rotate("+this._angle+"deg)";
			this._element.style["MozTransform"] = "rotate("+this._angle+"deg)";
			this._element.style["transform"] = "rotate("+this._angle+"deg)";
			return this;
		}
		
		// Otherwise return the value.
		return this._angle;
	},

	/**
	 * @brief Enable or disable mouse rotation.
	 * @param enabled True to enable, false to disable.
	 */
	mouseRotate : function(enabled) {
		// Scope.
		var that = this;
		
		// Decide what to do.
		if (enabled)
		{
			// Add the scrolling event.
			this._element.onmousewheel = function(e) {
				var fAngle = e.wheelDelta < 0 ? -10 : 10;
				that.rotate((that.rotate() + fAngle) % 360);
			}
		}
		else
		{
			this._element.onmousewheel = null;
		}
	},
	
	/*
	mouseMove : function(enabled) {
		
		// Scope and variables.
		var that = this;
		
		var iStartX; var iStartY;
	
		var jUp = function(e) {
			that._element.onmouseup = null;
			that._element.onmousedown = null;
			//that._element.onmousemove = null;
		};
		var jMove = function(e) {
			// TODO: Put into mm!!!
			that._element.style.left = (e.pageX - iStartX) + "px";
			that._element.style.top  = (e.pageY - iStartY) + "px";
		};
		var jDown = function(e) {
			iStartX = e.offsetX;
			iStartY = e.offsetY;
			that._element.onmouseup = jUp;
			that._element.onmousemove = jMove;
		};
		
		this._element.onmousedown = jDown;
	},
	*/

});


/**
 * @brief The ShapeClipv1 is a Pad which can move the ShapeClip using a sync-pulse.
 */
var ShapeClip = Pad.extend({

	// Signal Constants.
	HIGH_IDX 	: 0,		// The index into the _signals array for the HIGH pulse.  This should always be 255 at index 0.
	LOW_IDX  	: 1,		// The index into the _signals array for the LOW pulse.  This should always be 0 at index 1.
	RED_IDX  	: 2,		// The index into the _signals array for the RED pulse.  This should always be 0-255 at index 2.
	GREEN_IDX  	: 3,		// The index into the _signals array for the GREEN pulse.  This should always be 0-255 at index 3.
	BLUE_IDX  	: 4,		// The index into the _signals array for the BLUE pulse.  This should always be 0-255 at index 4.
	
	FORCE_REDRAW : true,	// Force a redraw after every pulse.
	CENTER_SPLIT : true,	// Is there a black space between the two LDR signals?
	PULSE_WIDTH : 200,		// The time the LDR has to sample each item in _signals. 200ms * 5 (for 5 pulses) is 1 RGB frame per second.
	TRAVEL_HEIGHT : 48.0,	// The number of mm that this ShapeClip unit can travel in mm.  (60mm screw length - 12mm flange height)
	
	/**
	 * @brief Construct this ShapeClipv1.
	 * @param settings The dictionary of arguments.
	 *      settings.width  	- The total width of the pad (px).
	 *      settings.height 	- The total height of the pad (px).
	 *      settings.x   		- The horizontal centre position of the pad from the top-left of the screen (px).
	 *      settings.y   		- The vertical centre position of the pad from the top-left of the screen (px).
	 *      settings.angle   	- The rotation applied to this pad in degrees.  0 degrees is the top of the screen.
	 *      settings.parent     - The parent element within which to add the pad.
	 *      settings.mouserot   - Is mouse rotation on scroll enabled. Boolean, true by default.
	 *      settings.pulse      - Is the pulse enabled from the start.  Default = false.
	 */
	init : function(settings) {
		
		// Create the underlying pad.
		this._super(settings);
		
		// Create an element for controlling LDR1
		this._ldr1Element = document.createElement("div");
		this._ldr1Element.classList.add("sc_control");
		this._ldr1Element.style.position = "absolute";
		this._ldr1Element.style.width  = this.CENTER_SPLIT ? "40%" : "50%";
		this._ldr1Element.style.height = "100%";
		this._ldr1Element.style.top    = "0px";
		this._ldr1Element.style.left   = "0px";
		this._ldr1Element.style["background-color"] = "white";
		this._ldr1Element.style["pointer-events"] = "none";
		this._element.appendChild(this._ldr1Element);
		
		// Create an element for controlling LDR1
		this._ldr2Element = document.createElement("div");
		this._ldr2Element.classList.add("sc_control");
		this._ldr2Element.style.position = "absolute";
		this._ldr2Element.style.width  = this.CENTER_SPLIT ? "40%" : "50%";
		this._ldr2Element.style.height = "100%";
		this._ldr2Element.style.top    = "0px";
		this._ldr2Element.style.left   = this.CENTER_SPLIT ? "60%" : "50%";
		this._ldr2Element.style["background-color"] = "black";
		this._ldr2Element.style["pointer-events"] = "none";
		this._element.appendChild(this._ldr2Element);
		
		// LDR values.
		this._ldr1(0.0);
		this._ldr2(0.0);
		
		// RGB Signal Pattern.
		this._signals = [255, 0, 0, 0, 0];
		
		// Pulsing values.
		this._bStopPulse = false;
		this._pLDR1PulseTmr = null;
		this._jPulseStopped = null;
		
		// Begin pulsing.
		if (settings.pulse || false)
			this.pulse();
	},
	
	/**
	 * @brief Delete this pad.
	 */
	remove : function() { 
		
		// Stop the timer.
		this.stopPulse(function(){
			this._super();
		});
		
		// Remove it from the DOM.
		this._super();
	},
	
	/**
	 * @brief Set/Get the value of LDR1 as a 0-1 percentage.
	 * @param percent The value this LDR should transmit as a 0-1 percentage.
	 * @return The percentage value of this LDR, or if parameters are passed, the pad itself. 
	 */
	_ldr1 : function(percent) {
		
		// If data is given, set it.
		if (percent !== undefined)
		{
			if (percent < 0) percent = 0;
			if (percent > 1) percent = 1;
			this._fLDR1 = (percent * 100.0);
			this._ldr1Element.style["background-color"] = "hsl(0,0%,"+this._fLDR1+"%)";
			return this;
		}
		
		// Otherwise return the value.
		return (this._fLDR1 * 0.01);
	},
	
	/**
	 * @brief Set/Get the value of LDR1 as a 0-255 value.
	 * @param percent The value this LDR should transmit as a 0-255 value.
	 * @return The byte value of this LDR, or if parameters are passed, the pad itself. 
	 */
	_ldr1b : function(byte) {
		if (byte !== undefined) { this._ldr1(byte / 255.0); return this; }
		return parseInt(this._ldr1() * 255);
	},
	
	/**
	 * @brief Set/Get the value of LDR2 as a 0-1 percentage.
	 * @param percent The value this LDR should transmit as a 0-1 percentage.
	 * @return The percentage value of this LDR, or if parameters are passed, the pad itself. 
	 */
	_ldr2 : function(percent) {
		// If data is given, set it.
		if (percent !== undefined)
		{
			if (percent < 0) percent = 0;
			if (percent > 1) percent = 1;					
			this._fLDR2 = (percent * 100.0);
			this._ldr2Element.style["background-color"] = "hsl(0,0%,"+this._fLDR2+"%)";
			return this;
		}
		
		// Otherwise return the value.
		return (this._fLDR2 * 0.01);
	},
	
	/**
	 * @brief Set/Get the value of LDR2 as a 0-255 value.
	 * @param percent The value this LDR should transmit as a 0-255 value.
	 * @return The byte value of this LDR, or if parameters are passed, the pad itself. 
	 */
	_ldr2b : function(byte) {
		if (byte !== undefined) { this._ldr2(byte / 255.0); return this; }
		return parseInt(this._ldr2() * 255);
	},
	
	/**
	 * @brief Set/Get the red channel.
	 * @param value The value in the red channel (0-255).  Optional, if missing the value is returned.
	 * @return The value in the red channel, or if parameters are passed, the pad itself.
	 */
	r : function(value) {
		if (value !== undefined) { this._signals[this.RED_IDX] = value; return this; }
		return parseInt(this._signals[this.RED_IDX]);
	},
	/**
	 * @brief Set/Get the red channel.
	 * @param value The value in the red channel (0-255).  Optional, if missing the value is returned.
	 * @return The value in the red channel, or if parameters are passed, the pad itself.
	 */
	g : function(value) {
		if (value !== undefined) { this._signals[this.GREEN_IDX] = value; return this; }
		return parseInt(this._signals[this.GREEN_IDX]);
	},
	/**
	 * @brief Set/Get the red channel.
	 * @param value The value in the red channel (0-255).  Optional, if missing the value is returned.
	 * @return The value in the red channel, or if parameters are passed, the pad itself.
	 */
	b : function(value) {
		if (value !== undefined) { this._signals[this.BLUE_IDX] = value; return this; }
		return parseInt(this._signals[this.BLUE_IDX]);
	},
	
	/**
	 * @brief Set/Get the colour of the shape-clip device on this pad.
	 * This will accept three parameters in order: r,g,b (0-255).
	 * It will also accept a hex string, list or dictionary in the format: "#RRGGBB" | "#RGB" | [r,g,b] | { r:X,g:Y,b:Z } | { R:X, G:Y, B:Z }
	 * @return The value of this colour as a RGB tuple [r,g,b], or if parameters are passed, the colour itself.
	 */
	colour : function(value) {
		
		// If no arguments, return the colour.
		if (arguments.length == 0)
		{
			// Return as a triplet.
			return [this.r(), this.g(), this.b()];
		
			// Get the colour as hex.
			//function componentToHex(c) { var hex = c.toString(16); return hex.length == 1 ? "0" + hex : hex; }
			//return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
		}
		
		// If there is one argument, treat as array or dictionary.
		if (arguments.length == 1)
		{
			// The args we will interpret.
			var r = 0;
			var g = 0;
			var b = 0;
			
			// Convert hex into RGB. - http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
			function hexToRgb(hex) {
				var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
				hex = hex.replace(shorthandRegex, function(m, r, g, b) { return r + r + g + g + b + b; });
				var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
				return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
			}
			
			// Check for list or dictionaries and interpret results, allowing for: "#RRGGBB" | "#RGB" | [r,g,b] | { r:X,g:Y,b:Z } | { R:X, G:Y, B:Z }
			var kValue = arguments[0];
			if 		(typeof(kValue) === "string") { var colour = hexToRgb(kValue); r = colour.r; g = colour.g; b = colour.b; }
			else if (kValue[0]   !== undefined && kValue[1]   !== undefined && kValue[2]   !== undefined) { r = kValue[0];   g = kValue[1];   b = kValue[2]	   	}
			else if (kValue['r'] !== undefined && kValue['g'] !== undefined && kValue['b'] !== undefined) { r = kValue['r']; g = kValue['g']; b = kValue['b']	}
			else if (kValue['R'] !== undefined && kValue['G'] !== undefined && kValue['B'] !== undefined) { r = kValue['R']; g = kValue['G']; b = kValue['B']	}
			
			// Load them into the signals table.
			this._signals[this.RED_IDX]   = r;
			this._signals[this.GREEN_IDX] = g;
			this._signals[this.BLUE_IDX]  = b;
			
			// Return the pad.
			return this;
		}
		
		// If there are three arguments, treat them as RGB.
		else if (arguments.length == 3)
		{
			// Treat as floats or ints.
			var bFloat = false;
			
			// Load them into the signals table.
			this._signals[this.RED_IDX]   = bFloat ? parseFloat(arguments[0]) : parseInt(arguments[0]);
			this._signals[this.GREEN_IDX] = bFloat ? parseFloat(arguments[1]) : parseInt(arguments[1]);
			this._signals[this.BLUE_IDX]  = bFloat ? parseFloat(arguments[2]) : parseInt(arguments[2]);
			
			// Return the pad.
			return this;
		}
		
		else
		{
			throw new Exception("Cannot interpret colour.");
		}
		
	},
	
	/**
	 * @brief Stop the pulsing by killing the signal.
	 * If the pad is pulsing, this will incur a delay while the last pulse completes.  The jStopped callback will be called when it is stopped.
	 * If the pad is not pulsing, this will call the jStopped callback immediately.
	 * @jStopped A function to call when the pulsing stops. Optional.
	 * @return This pad.
	 */
	stopPulse : function(jStopped) {
		
		// If we are not pulsing already, call immediately.
		if (this._pLDR1PulseTmr == null)
		{
			// Clear values.
			this._jPulseStopped = null;
			this._bStopPulse = true;
			
			// Raise the stopped callback.
			if (jStopped != null)
				jStopped(this);
		}
		else
		{
			// Set up the values for so we can stop at the end of the pulse.
			this._jPulseStopped = jStopped;
			this._bStopPulse = true;
		}
		
		// Return the pad.
		return this;
	},
	
	/**
	 * @brief Begin the pulsing on LDR1 which transmits colour.
	 */
	pulse : function() {
		
		// Prevent it from already pulsing.
		if (this._pLDR1PulseTmr != null)
			throw "Pad is already pulsing";
		
		// Stick some variables on the stack.
		var that 	= this;
		var signal 	= 0;
		
		//Profiling code.
		//var start = performance.now();
		//var last = start;
		//var id = this._id;
		
		// Enable LDR1 pulse.
		this._bStopPulse = false;
		
		// Define a loop function.
		var loop;
		loop = function() {
			
			// Profiling code.
			// Let's log the time to measure the drawing load error.
			//var curr = performance.now();
			//lines.push("" + id + ","+(curr-last)+","+(curr-start));
			//last = curr;
			
			// Update graphics (approx 4ms timer error "on my machine" TM)
			that._ldr1b( that._signals[signal] );
			
			// Force a redraw (or relayout) after every pulse.
			if (that.FORCE_REDRAW) 
			{
				that._element.style.display = "none";
				that._element.offsetHeight;
				that._element.style.display = "block";
			}
			
			// Increase signal and loop.
			signal = ( signal + 1 ) % that._signals.length;
			
			// If we have a stop signal AND the next pulse is the first one, don't do it.
			if (that._bStopPulse && signal != 0)
			{
				// Cleanup.
				var jCallback = that._jPulseStopped;
				that._jPulseStopped = null;
				clearTimeout(that._pLDR1PulseTmr);
				that._pLDR1PulseTmr = null;
				
				// Callback.
				if (jCallback != null)
					jCallback(that);
				
				return;
			}
			
			// Otherwise, set the next pulse.
			that._pLDR1PulseTmr = setTimeout(loop, that.PULSE_WIDTH);
			
		};
		loop();
		
		// Return this pad.
		return this;
	},
	
	/**
	 * @brief Set/Get the height value this pad should transmit as a percentage.
	 * @param value The height (as a 0-1 percentage) for the device. 0 is lowest. 1 is highest.
	 * @return The height value as a 0-1 percentage, or if parameters are passed, the pad itself.
	 */
	height : function(value) {
		if (value !== undefined) { this._ldr2(value); }
		return this._ldr2();
	},
	
	/**
	 * @brief Set/Get the height value this pad should transmit as mm.
	 * The precision of this value is probably not completely accurate.  Based on TRAVEL_HEIGHT constant.
	 * @param value The height (mm) for the device. 0 is lowest. TRAVEL_HEIGHT is highest.
	 * @return The height value (mm) between 0 and TRAVEL_HEIGHT, or if parameters are passed, the pad itself.
	 */
	heightmm : function(value) {
		if (value !== undefined) { this._ldr2(value / this.TRAVEL_HEIGHT) }
		return this._ldr2() * this.TRAVEL_HEIGHT;
	},
	
});

/**
 * @brief The ShapeClipHeight is a Pad which supports single colour height drive, not colour.
 */
var ShapeClipHeight = Pad.extend({

	// Device Constants.
	TRAVEL_HEIGHT : 48.0,	// The number of mm that this ShapeClip unit can travel in mm.  (60mm screw length - 12mm flange height)
	
	/**
	 * @brief Construct this ShapeClipv1.
	 * @param settings The dictionary of arguments.
	 *      settings.width  	- The total width of the pad (px).
	 *      settings.height 	- The total height of the pad (px).
	 *      settings.x   		- The horizontal centre position of the pad from the top-left of the screen (px).
	 *      settings.y   		- The vertical centre position of the pad from the top-left of the screen (px).
	 *      settings.angle   	- The rotation applied to this pad in degrees.  0 degrees is the top of the screen.
	 *      settings.parent     - The parent element within which to add the pad.
	 *      settings.mouserot   - Is mouse rotation on scroll enabled. Boolean, true by default.
	 */
	init : function(settings) {
		
		// Create the underlying pad.
		this._super(settings);
		
		// Create an element for controlling LDR1
		this._ldrElement = document.createElement("div");
		this._ldrElement.classList.add("sc_control");
		this._ldrElement.style.position = "absolute";
		this._ldrElement.style.width  = "100%";
		this._ldrElement.style.height = "100%";
		this._ldrElement.style.top    = "0px";
		this._ldrElement.style.left   = "0px";
		this._ldrElement.style["background-color"] = "white";
		this._ldrElement.style["pointer-events"] = "none";
		this._element.appendChild(this._ldrElement);
		
		// LDR values.
		this._ldr(0.0);
	},
	
	/**
	 * @brief Delete this pad.
	 */
	remove : function() { 
		
		// Stop the timer.
		this.stopPulse(function(){
			this._super();
		});
		
		// Remove it from the DOM.
		this._super();
	},
	
	/**
	 * @brief Set/Get the value of both LDRs as a 0-1 percentage.
	 * @param percent The value the LDRs should transmit as a 0-1 percentage.
	 * @return The percentage value of the LDRs, or if parameters are passed, the pad itself. 
	 */
	_ldr : function(percent) {
		
		// If data is given, set it.
		if (percent !== undefined)
		{
			if (percent < 0) percent = 0;
			if (percent > 1) percent = 1;
			this._fLDR = (percent * 100.0);
			this._ldrElement.style["background-color"] = "hsl(0,0%,"+this._fLDR+"%)";
			return this;
		}
		
		// Otherwise return the value.
		return (this._fLDR * 0.01);
	},
	
	/**
	 * @brief Set/Get the value both LDRs as a 0-255 value.
	 * @param percent The value the LDRs should transmit as a 0-255 value.
	 * @return The byte value of the LDRs, or if parameters are passed, the pad itself. 
	 */
	_ldrb : function(byte) {
		if (byte !== undefined) { this._ldr(byte / 255.0); return this; }
		return parseInt(this._ldr() * 255);
	},
	
	/**
	 * @brief Set/Get the height value this pad should transmit as a percentage.
	 * @param value The height (as a 0-1 percentage) for the device. 0 is lowest. 1 is highest.
	 * @return The height value as a 0-1 percentage, or if parameters are passed, the pad itself.
	 */
	height : function(value) {
		if (value !== undefined) { this._ldr(value); }
		return this._ldr();
	},
	
	/**
	 * @brief Set/Get the height value this pad should transmit as mm.
	 * The precision of this value is probably not completely accurate.  Based on TRAVEL_HEIGHT constant.
	 * @param value The height (mm) for the device. 0 is lowest. TRAVEL_HEIGHT is highest.
	 * @return The height value (mm) between 0 and TRAVEL_HEIGHT, or if parameters are passed, the pad itself.
	 */
	heightmm : function(value) {
		if (value !== undefined) { this._ldr(value / this.TRAVEL_HEIGHT) }
		return this._ldr() * this.TRAVEL_HEIGHT;
	},
	
	/**
	 * @brief Quickly show the LDRs the entire colour range they can produce.
	 * This can be helpful if the internal clip calibration gets out of whack.
	 */
	showRange: function(value) {
		
	},
	
});


/**
 * @brief The ShapeClipSerial is a Pad which controls the shape clip via serial-over-screen.
 */
var ShapeClipSerial = Pad.extend({

	FORCE_REDRAW : true,	// Force a redraw after every pulse.
	CENTER_SPLIT : true,	// Is there a black space between the two LDR signals?
	PULSE_WIDTH :  60,		// The line state time for each bit.  Can run at 30 well enough. 
	
	PULSE_SPLIT : true,		// Do we want to split pulses that bring the line back to 0.  True is optimised, but slightly less reliable at fast pulse widths.
	FRAME_PACK : false,		// Do we want to pack the start of each transmission frame with line 0.  Helps debug and reliability but slows down.
	
	
	/**
	 * @brief Construct this ShapeClipv1.
	 * @param settings The dictionary of arguments.
	 *      settings.width  	- The total width of the pad (px).
	 *      settings.height 	- The total height of the pad (px).
	 *      settings.x   		- The horizontal centre position of the pad from the top-left of the screen (px).
	 *      settings.y   		- The vertical centre position of the pad from the top-left of the screen (px).
	 *      settings.angle   	- The rotation applied to this pad in degrees.  0 degrees is the top of the screen.
	 *      settings.parent     - The parent element within which to add the pad.
	 *      settings.mouserot   - Is mouse rotation on scroll enabled. Boolean, true by default.
	 *      settings.pulse      - Is the pulse enabled from the start.  Default = false.
	 */
	init : function(settings) {
		
		// Create the underlying pad.
		this._super(settings);
		
		// Create an element for controlling LDR1
		this._ldr1Element = document.createElement("div");
		this._ldr1Element.classList.add("sc_control");
		this._ldr1Element.style.position = "absolute";
		this._ldr1Element.style.width  = this.CENTER_SPLIT ? "40%" : "50%";
		this._ldr1Element.style.height = "100%";
		this._ldr1Element.style.top    = "0px";
		this._ldr1Element.style.left   = "0px";
		this._ldr1Element.style["background-color"] = "white";
		this._ldr1Element.style["pointer-events"] = "none";
		this._element.appendChild(this._ldr1Element);
		
		// Create an element for controlling LDR1
		this._ldr2Element = document.createElement("div");
		this._ldr2Element.classList.add("sc_control");
		this._ldr2Element.style.position = "absolute";
		this._ldr2Element.style.width  = this.CENTER_SPLIT ? "40%" : "50%";
		this._ldr2Element.style.height = "100%";
		this._ldr2Element.style.top    = "0px";
		this._ldr2Element.style.left   = this.CENTER_SPLIT ? "60%" : "50%";
		this._ldr2Element.style["background-color"] = "black";
		this._ldr2Element.style["pointer-events"] = "none";
		this._element.appendChild(this._ldr2Element);
		
		// LDR values.
		this._ldr1(0.0);
		this._ldr2(0.0);
		
		// Signals control.
		this._nextSignals = null;
		this._nextSignalsCallback = null;
		this._signals = [];
		this._signalsCallback = null;
		
		this._signals = [];
		this._signals = this._signals.concat( this._pack( 0xFF ) );
		this._signals = this._signals.concat( this._pack( 0x55 ) );
		this._signals = this._signals.concat( this._pack( 0x00 ) );
		
		/*
		this._signals = this._signals.concat( this._pack("H".charCodeAt(0) ) );
		this._signals = this._signals.concat( this._pack( 0xff ) );
		this._signals = this._signals.concat( this._pack("X".charCodeAt(0) ) );
		
		this._signals = this._signals.concat( this._pack("R".charCodeAt(0) ) );
		this._signals = this._signals.concat( this._pack( 0xff ) );
		this._signals = this._signals.concat( this._pack("X".charCodeAt(0) ) );
		
		this._signals = this._signals.concat( this._pack("H".charCodeAt(0) ) );
		this._signals = this._signals.concat( this._pack( 0x00 ) );
		this._signals = this._signals.concat( this._pack("X".charCodeAt(0) ) );
		
		this._signals = this._signals.concat( this._pack("R".charCodeAt(0) ) );
		this._signals = this._signals.concat( this._pack( 0x00 ) );
		this._signals = this._signals.concat( this._pack("X".charCodeAt(0) ) );
		
		this._signals = this._signals.concat( this._pack("H".charCodeAt(0) ) );
		this._signals = this._signals.concat( this._pack( 128 ) );
		this._signals = this._signals.concat( this._pack("X".charCodeAt(0) ) );
		*/
		
		
		/*this._signals = this._signals.concat( this._pack("R".charCodeAt(0) ) );
		this._signals = this._signals.concat( this._pack( 0x7f ) );
		this._signals = this._signals.concat( this._pack("X".charCodeAt(0) ) );
		
		this._signals = this._signals.concat( this._pack("G".charCodeAt(0) ) );
		this._signals = this._signals.concat( this._pack( 0x00 ) );
		this._signals = this._signals.concat( this._pack("X".charCodeAt(0) ) );*/
		
		//this._signals = this._signals.concat( this._pack( 0xff ) );
		//this._signals = a.concat(b).concat(c);
		
		console.log( this._signals );
		
		// Pulsing values.
		this._bStopPulse = false;
		this._pLDR1PulseTmr = null;
		this._jPulseStopped = null;
		
		// Begin pulsing.
		if (settings.pulse || false)
			this.pulse();
	},
	
	/**
	 * @brief Pack a value into an array of bytes for transmission to the ShapeClip.
	 * See _packBytes and _bytes for details.
	 * @param value The input unsigned 8 bit integer.
	 * @return The packed array of transmission signals.
	 */
	_pack : function ( value ) {
		return this._packBytes( this._bytes( value ) );
	},
	
	/**
	 * @brief Pack the bytes into an array of control signals for the LDR pads.
	 * The ShapeClip can interpret these signals.
	 * @param bytes The array of bytes to convert, e.g. [0,0,0,0, 1,1,1,1]
	 * @return An array of 255, 128, and 0 values. 255 means line high. 128 means line zero, 0 means line low.
	 */
	_packBytes : function( bytes ) {
		
		// Outputs.
		var packedframe = [];
		var parity = false;
		
		// Pack the bit values from a frame.  Based on RS232.
		// |----------|----------|----------|--------|--------|--------|--------|--------|--------|--------|--------|--------|-------\
		// | SFRAME2  |  SFRAME  | STARTBIT |  DATA  |  DATA  |  DATA  |  DATA  |  DATA  |  DATA  |  DATA  |  DATA  | PARITY |  EFRAME
		// |----------|----------|----------|--------|--------|--------|--------|--------|--------|--------|--------|--------|---------\
		
		// Do we want to pack the start of each frame with 0 line.
		if (this.FRAME_PACK)
		{
			packedframe.push( 128 );
			packedframe.push( 128 );
			packedframe.push( 128 );
			packedframe.push( 128 );
		}
		
		// Push the end, start, and start 2 bit.
		packedframe.push(0)		// EFRAME
		packedframe.push( 128 );
		packedframe.push(255)	// SFRAME2
		packedframe.push( 128 );
		packedframe.push(0)		// SFRAME
		
		// Pack data.
		var prevState = 0;
		for( var i=0; i<bytes.length; i++ )
		{
			// Push the line to 0.
			packedframe.push( 128 );
			
			// If we have a high byte, raise the line.
			if( bytes[i] == 1 )
			{
				packedframe.push( 255 );
				parity = !parity;
			}
			
			// Otherwise bring it down.
			else
			{
				packedframe.push( 0 );
			}
			
			prevState = bytes[i];
		}
		
		// Pack the parity bit and bring the line to 0 for the end of frame.
		packedframe.push( 128 );
		packedframe.push( parity ? 0 : 255 )	// PARITY
		packedframe.push( 128 );
		
		return packedframe;
	},
	
	/**
	 * Convert an unsigned 8 bit binary value into an array of bytes.
	 * @param value The value to convert. e.g. 0x0F
	 * @return The array of bytes returned e.g. [ 0,0,0,0, 1,1,1,1 ]
	 */
	_bytes : function( value ) {
		var sbits = parseInt(value).toString(2);
		if (sbits.length > 8) throw "too many bits";
		//if (sbits.length > 16) throw "too many bits";
		if (sbits[0] == "-") throw "no negative values"
		var len = sbits.length - 1;
		function b(i) { return (sbits[len-i] == "1") ? 1 : 0; }
		return [ b(7),b(6),b(5),b(4), b(3),b(2),b(1),b(0)  ];
		//return [ b(15),b(14),b(13),b(12), b(11),b(10),b(9),b(8), b(7),b(6),b(5),b(4), b(3),b(2),b(1),b(0)  ];
	},
	
	/**
	 * @brief Delete this pad.
	 */
	remove : function() { 
		
		// Stop the timer.
		this.stopPulse(function(){
			this._super();
		});
		
		// Remove it from the DOM.
		this._super();
	},
	
	/**
	 * @brief Set/Get the value of LDR1 as a 0-1 percentage.
	 * @param percent The value this LDR should transmit as a 0-1 percentage.
	 * @return The percentage value of this LDR, or if parameters are passed, the pad itself. 
	 */
	_ldr1 : function(percent) {
		
		// If data is given, set it.
		if (percent !== undefined)
		{
			if (percent < 0) percent = 0;
			if (percent > 1) percent = 1;
			this._fLDR1 = (percent * 100.0);
			this._ldr1Element.style["background-color"] = "hsl(0,0%,"+this._fLDR1+"%)";
			return this;
		}
		
		// Otherwise return the value.
		return (this._fLDR1 * 0.01);
	},
	
	/**
	 * @brief Set/Get the value of LDR1 as a 0-255 value.
	 * @param percent The value this LDR should transmit as a 0-255 value.
	 * @return The byte value of this LDR, or if parameters are passed, the pad itself. 
	 */
	_ldr1b : function(byte) {
		if (byte !== undefined) { this._ldr1(byte / 255.0); return this; }
		return parseInt(this._ldr1() * 255);
	},
	
	/**
	 * @brief Set/Get the value of LDR2 as a 0-1 percentage.
	 * @param percent The value this LDR should transmit as a 0-1 percentage.
	 * @return The percentage value of this LDR, or if parameters are passed, the pad itself. 
	 */
	_ldr2 : function(percent) {
		// If data is given, set it.
		if (percent !== undefined)
		{
			if (percent < 0) percent = 0;
			if (percent > 1) percent = 1;					
			this._fLDR2 = (percent * 100.0);
			this._ldr2Element.style["background-color"] = "hsl(0,0%,"+this._fLDR2+"%)";
			return this;
		}
		
		// Otherwise return the value.
		return (this._fLDR2 * 0.01);
	},
	
	/**
	 * @brief Set/Get the value of LDR2 as a 0-255 value.
	 * @param percent The value this LDR should transmit as a 0-255 value.
	 * @return The byte value of this LDR, or if parameters are passed, the pad itself. 
	 */
	_ldr2b : function(byte) {
		if (byte !== undefined) { this._ldr2(byte / 255.0); return this; }
		return parseInt(this._ldr2() * 255);
	},
	
	/**
	 * @brief Send a string of character commands to the ShapeClip.
	 * @param lCommands A list of commands to send in sequence. e.g. ['r', 0xFF, 'h', 255];
	 * @param jComplete A function which will be called when send has completed.
	 */
	send : function(lCommands, jComplete) {	
		
		// If we are going to override.
		if (this._nextSignals != null)
			throw "Cannot send signals while others are queued.";
		
		// For each item in the array, pack it and add it to the signals.
		var packed = [];
		for (var cmd = 0; cmd < lCommands.length; ++cmd)
		{
			if (typeof lCommands[cmd] == "string")
				packed = packed.concat( this._pack( lCommands[cmd].charCodeAt(0) ) );
			else if (typeof lCommands[cmd] == "number")
				packed = packed.concat( this._pack( lCommands[cmd] ) );
			else
				throw "cannot pack things which are not strings or integers";
		}
		
		// Add these to the queue.
		this._nextSignalsCallback = jComplete || null;
		this._nextSignals = packed;
		
		// Chaining.
		return this;
	},
	
	
	/**
	 * @brief Stop the pulsing by killing the signal.
	 * If the pad is pulsing, this will incur a delay while the last pulse completes.  The jStopped callback will be called when it is stopped.
	 * If the pad is not pulsing, this will call the jStopped callback immediately.
	 * @jStopped A function to call when the pulsing stops. Optional.
	 * @return This pad.
	 */
	stopPulse : function(jStopped) {
		
		// If we are not pulsing already, call immediately.
		if (this._pLDR1PulseTmr == null)
		{
			// Clear values.
			this._jPulseStopped = null;
			this._bStopPulse = true;
			
			// Raise the stopped callback.
			if (jStopped != null)
				jStopped(this);
		}
		else
		{
			// Set up the values for so we can stop at the end of the pulse.
			this._jPulseStopped = jStopped;
			this._bStopPulse = true;
		}
		
		// Return the pad.
		return this;
	},
	
	/**
	 * @brief Begin the pulsing on LDR1 which transmits colour.
	 */
	pulse : function() {
		
		// Prevent it from already pulsing.
		if (this._pLDR1PulseTmr != null)
			throw "Pad is already pulsing";
		
		// Stick some variables on the stack.
		var that 	= this;
		var signal 	= 0;
		
		// Enable LDR1 pulse.
		this._bStopPulse = false;
		
		// Define a loop function.
		var loop;
		loop = function() {
			
			// Update graphics (approx 4ms timer error "on my machine" TM)
			var date = new Date();
			var millis = date.getMilliseconds();
			
			// Create a carrier wave.
			//var phase = 128 + Math.sin((millis/100)/Math.PI ) * 16;	// Modulating.
			var phase = 128;											// Static.
			
			// Compute the diff-drive parameters for each LDR.
			var ldr1tmp = (phase - ( that._signals[signal] - 128 )) / 2.0;
			var ldr2tmp = (phase + ( that._signals[signal] - 128 )) / 2.0;
			
			// Push the values.
			that._ldr1b( ldr1tmp );
			that._ldr2b( ldr2tmp );
			
			// Force a redraw (or relayout) after every pulse.
			if (that.FORCE_REDRAW) 
			{
				that._element.style.display = "none";
				that._element.offsetHeight;
				that._element.style.display = "block";
			}
			
			// If we are on the last signal.
			if (signal == that._signals.length - 1)
			{
				// Callback.
				if (that._signalsCallback != null) 
					that._signalsCallback(this);
				
				// Swap the signal to the next one IF there is one to swap it for.
				if (that._nextSignals != null && that._nextSignals.length > 0)
				{
					that._signals = that._nextSignals;
					that._signalsCallback = that._nextSignalsCallback;
					that._nextSignals = null;
					that._nextSignalsCallback = null;
				}
				
			}
			
			// Increase signal and loop.
			signal = ( signal + 1 ) % that._signals.length;
			
			// If we have a stop signal AND the next pulse is the first one, don't do it.
			if (that._bStopPulse && signal != 0)
			{
				// Cleanup.
				var jCallback = that._jPulseStopped;
				that._jPulseStopped = null;
				clearTimeout(that._pLDR1PulseTmr);
				that._pLDR1PulseTmr = null;
				
				// Callback.
				if (jCallback != null)
					jCallback(that);
				
				return;
			}
			
			// Pulse split optimisation on min-line signals.
			if (ldr1tmp == 128 && ldr2tmp == 128 && that.PULSE_SPLIT == true)
				that._pLDR1PulseTmr = setTimeout(loop, that.PULSE_WIDTH / 2.0);
			
			// Normal transmission period.
			else
				that._pLDR1PulseTmr = setTimeout(loop, that.PULSE_WIDTH);
			
		};
		loop();
		
		// Return this pad.
		return this;
	},
	
});