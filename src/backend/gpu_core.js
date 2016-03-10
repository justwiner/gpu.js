///
/// Class: gpu_core
///
/// *gpu_core.js* internal functions namespace
/// *gpu.js* PUBLIC function namespace
///
/// I know @private makes more sense, but since the documentation engine state is undetirmined.
/// (See https://github.com/gpujs/gpu.js/issues/19 regarding documentation engine issue)
/// File isolation is currently the best way to go
///
var gpu_core = (function() {

	function gpu_core() {
		var gl, canvas;

		canvas = undefined;
		if (gl === undefined) {
			canvas = gpu_utils.init_canvas();
			gl = gpu_utils.init_webgl(canvas);
		}

		this.webgl = gl;
		this.canvas = canvas;
		this.programCache = {};
		this.endianness = gpu_utils.system_endianness();

		this.functionBuilder = new functionBuilder(this);
		this.functionBuilder.polyfillStandardFunctions();
	}

	gpu_core.prototype.getWebgl = function() {
		return this.webgl;
	};

	gpu_core.prototype.getCanvas = function(mode) {
		if (mode == "cpu") {
			return null;
		}
		
		return this.canvas;
	};

	///
	/// Function: createKernel
	///
	/// The core GPU.js function
	///
	/// The parameter object contains the following sub parameters
	///
	/// |---------------|---------------|---------------------------------------------------------------------------|
	/// | Name          | Default value | Description                                                               |
	/// |---------------|---------------|---------------------------------------------------------------------------|
	/// | dimensions    | [1024]        | Thread dimension array                                                    |
	/// | mode          | null          | CPU / GPU configuration mode, "auto" / null. Has the following modes.     |
	/// |               |               |     + null / "auto" : Attempts to build GPU mode, else fallbacks          |
	/// |               |               |     + "gpu" : Attempts to build GPU mode, else fallbacks                  |
	/// |               |               |     + "cpu" : Forces JS fallback mode only                                |
	/// |---------------|---------------|---------------------------------------------------------------------------|
	///
	/// Parameters:
	/// 	inputFunction   {JS Function} The calling to perform the conversion
	/// 	paramObj        {Object}      The parameter configuration object
	///
	/// Returns:
	/// 	callable function to run
	///
	function createKernel(kernel, paramObj) {
		//
		// basic parameters safety checks
		//
		if( kernel === undefined ) {
			throw "Missing kernel parameter";
		}
		if( !(kernel instanceof Function) ) {
			throw "kernel parameter not a function";
		}
		if( paramObj === undefined ) {
			paramObj = {};
		}

		//
		// Get theconfig, fallbacks to default value if not set
		//
		paramObj.dimensions = paramObj.dimensions || [];
		var mode = paramObj.mode && paramObj.mode.toLowerCase();

		if ( mode == "cpu" ) {
			return this._mode_cpu(kernel, paramObj);
		}

		//
		// Attempts to do the glsl conversion
		//
		try {
			return this._mode_gpu(kernel, paramObj);
		} catch (e) {
			if ( mode != "gpu") {
				console.warning("Falling back to CPU!");
				return this._mode_cpu(kernel, paramObj);
			} else {
				throw e;
			}
		}
	};
	gpu_core.prototype.createKernel = createKernel;

	///
	/// Function: addFunction
	///
	/// Adds additional functions, that the kernel may call.
	///
	/// Parameters:
	/// 	jsFunction      - {JS Function}  JS Function to do conversion
	/// 	paramTypeArray  - {[String,...]} Parameter type array, assumes all parameters are "float" if null
	/// 	returnType      - {String}       The return type, assumes "float" if null
	///
	/// Retuns:
	/// 	{GPU} returns itself
	///
	function addFunction( jsFunction, paramTypeArray, returnType  ) {
		this.functionBuilder.addFunction( null, jsFunction, paramTypeArray, returnType );
		return this;
	}
	gpu_core.prototype.addFunction = addFunction;



	gpu_core.prototype.textureToArray = function(texture) {
		var copy = this.createKernel(function(x) {
			return x[this.thread.z][this.thread.y][this.thread.x];
		});

		return copy(texture);
	};

	return gpu_core;
})();