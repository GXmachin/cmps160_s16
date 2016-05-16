var gl;
var transUniform ;
var viewMatLoc;
var projectMatLoc;
var newVertices; // this will contain only the vertices(indices discarded)
var uniformNormalLoc;
var amountOfLightLoc;
var extractedVerticesAndColor;
var noVertices;
var dynamic_index;
var isFlatLoc;
var flatNormalLoc;
var halfVecLoc;
var viewerDirectionLoc;
var makeFlat = 1;
var diffuseOnly = true;
var makeOrtho = true;
var verticesAndnormals;
var normalMat;
var minMaxXYZ = new Float32Array([-1,1,-1,1,-1,1]) ;
var modelMat;
var viewMat;
var projMat;
var colorChanged = false;
var backGroundColor = new Float32Array([1.0,1.0,1.0,1.0]);
var backgroundChanged = false;
var viewerDirection = new Float32Array([0,0,1]);
var specularDirection = new Float32Array([0,0,1]);
var diffuseDirection = new Float32Array([0,0,1]);
var mouseDownBool = false;
var canvasWidth;
var canvasHeight;
var scaleNormalizer = 50;
var xyzScale =1;
var scaleLimit = 0.1;
var noObjects =1;
var objectVerticesArray = new Array(noObjects);
var objectIndexArray = new Array(noObjects);
var normalForFlatArray = new Array(noObjects);
var surfaceCenterForFlatArray = new Array(noObjects);
var noFacesArray = new Array(noObjects);
var modelMatArray = new Array(0); // initialize zero
var minMaxXYZArray = new Array(noObjects);
var newXYZTrans = new Array(noObjects);
var rotationXYZ = new Array(noObjects);
var uniformScaleXYZArray = new Array(noObjects);
var currSelectedObj = 0; //0 indexed variable for the currently selected object
var colorFrameBuffer;
var holdTexture;
var textureWidth = 512;
var textureHeight = 512;
var renderBuffer;
var isSelection = false;
var objColorCodes = new Float32Array([20,40,60,80,100,120,140, 160, 180, 200, 220, 240]);
var colorCodeLoc;
var isSelectionLoc;
var pointLightPos = new Float32Array([0.5,0.5,0.5]);
var pointLightPosLoc;
var surfaceCenterLoc;
var isLightLoc;

var cubeCoor = new Float32Array([
									1, -1, -1,  1,
									2,  1, -1,  1,
									3,  1,  1,  1,
									4, -1,  1,  1,
									5, -1, -1, -1,
									6,  1, -1, -1,
									7,  1,  1, -1,
									8, -1,  1, -1
									
								]);

var cubePoly = new Uint16Array([
								
								1, 2, 3, 4,
								2, 6, 7, 3,
								7, 6, 5, 8,
								8, 5, 1, 4,
								4, 3, 7, 8,
								6, 2, 1, 5
								
								]);


var modes = {
	
		ROTATE: 0,
		SCALE:	1,
		TRANSLATE: 2,
		DEFAULT: 4
		
		};
var currentMode = modes.DEFAULT;

//specular
var halfVector =  new Float32Array([0,0,0]);
var shininess =0;

//view
var eyeX = 0.0;
var eyeY = 0.0;
var eyeZ = 0.0; //update this based on the object z size
var centerX = 0.0;
var centerY = 0.0;
var centerZ = 0.0;
var upX = 0.0;
var upY = 1.0;
var upZ = 0.0;
var pushDownZ = 4;

//perspective
var	fovy = 70; //degrees 
var aspect = 1;
var near =0;
var far = 1000;




//write shader code

var V_SHADER = 
'attribute vec3 a_position; \n' +
'uniform mat4 model; \n '+
'uniform mat4 projectMat; \n' +
'uniform mat4 viewMat; \n' +
'uniform vec3 flat_normal; \n'+
'uniform vec3 surfaceCenter; \n'+
'attribute vec3 a_normal; \n' +
'varying vec3 smooth_normal; \n'+
'varying vec3 f_normal; \n'+
'varying vec3 vertexPosition; \n'+
'varying vec3 surfaceCenterInCube; \n'+
'void main(){  \n' +
'smooth_normal = mat3(model) * a_normal; \n' + 
'f_normal = mat3(model) * flat_normal; \n' + 
'vec4 mPosition = vec4(a_position ,1.0);'+
'vec4 bPosition = model *  mPosition;'+
'vertexPosition = vec3(bPosition.x/bPosition.w , bPosition.y/bPosition.w, bPosition.x/bPosition.w); \n' + 
'bPosition = model *  vec4(surfaceCenter, 1.0);'+
'surfaceCenterInCube = vec3(bPosition.x/bPosition.w , bPosition.y/bPosition.w, bPosition.x/bPosition.w); \n' + 
'mPosition = projectMat * viewMat * model *  mPosition; '+
'gl_Position =  mPosition;\n' + 
'}\n'

var F_SHADER =
'precision mediump float; \n' +
'uniform vec3 pointLightPos; \n'+
'uniform vec3 specLightReflec; \n' +
'uniform vec3 viewerDirection; \n' +
'uniform vec3 k_d; \n' +
'uniform float a_shininess; \n' +
'uniform vec3 diff_light_direction; \n' +
'uniform vec3 a_halfvector; \n' +
'varying vec3 smooth_normal; \n'+
'varying vec3 f_normal; \n'+
'varying vec3 vertexPosition; \n'+
'varying vec3 surfaceCenterInCube; \n'+
'uniform float I_d; \n' +
'uniform float isFlat; \n' +
'uniform float isSelection; \n' +
'uniform float colorCode; \n' +
'uniform float isLight; \n' +
'void main() { \n' +
'if(isSelection < 0.5 ) { \n' +
'vec3 specular; \n'+
'vec3 diffuse ; \n' +
'vec3 fv_normal; \n' +
'vec3 pointSrcHalfVector; \n' +
'vec3 pointLightDirection; \n' +
'if(isFlat > 0.5) { \n'+
'fv_normal = normalize(f_normal); \n'+
'pointLightDirection = (pointLightPos - surfaceCenterInCube); \n'+
'} \n' +
'else{ \n'+
'fv_normal = normalize(smooth_normal); \n'+
'pointLightDirection = (pointLightPos - vertexPosition); \n'+
'} \n'+
'if(length(pointLightDirection) > 0.0 ){ \n'+
'pointLightDirection = normalize(pointLightDirection); \n'+
'}\n'+
'pointSrcHalfVector = pointLightDirection + viewerDirection; \n'+
'if(length(pointSrcHalfVector) > 0.0 ){ \n'+
'pointSrcHalfVector = normalize(pointSrcHalfVector); \n'+
'}\n'+
'if(length(a_halfvector) > 0.0 ){ \n'+
'if(length(isLight) < 0.5 ){ \n'+
'specular = (pow(dot(fv_normal, normalize(a_halfvector)) , a_shininess) + pow(dot(fv_normal, pointSrcHalfVector) , a_shininess)) * specLightReflec; \n'+
'}\n'+
'else{\n'+
'specular = (pow(dot(fv_normal, normalize(a_halfvector)) , a_shininess)) * specLightReflec; \n'+
'} \n'+

'}\n'+
'else{\n'+
'specular = vec3(0,0,0); \n'+
'} \n'+
'diffuse = (I_d * dot(fv_normal, diff_light_direction) + I_d * dot(fv_normal, pointLightDirection))* k_d; \n' +
'gl_FragColor = vec4((specular + diffuse) , 1.0); \n'+
'} \n'+
'else{ \n'+
'gl_FragColor = vec4(colorCode ,0.0, 0.0, 1.0); \n'+
'} \n'+
'} \n'


//compile and link shader code
function compileShader(gl, shaderSource ,shaderType){
	
	//create the shader object
	var shaderObj = gl.createShader(shaderType);
	
	//link the shader object with the source
	gl.shaderSource(shaderObj, shaderSource);
	
	//compile the shader
	gl.compileShader(shaderObj);
	
	
	if(!(gl.getShaderParameter(shaderObj, gl.COMPILE_STATUS))){
		
		 throw (" could not compile shader: " + gl.getShaderInfoLog(shaderObj));
		 
	}
	
	
	return shaderObj;
	
}


function createProgram( gl, vertexShader, fragmentShader){
	
	//create program
	var program = gl.createProgram();
	
	//attach program
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	
	
	//link the programs
	gl.linkProgram(program);
	
	if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
		
		throw ("issue with linking programs: " + gl.getProgramInfoLog(program));
	}
	
	return program;
	
}

function renderForSelection(){

	 gl.bindFramebuffer(gl.FRAMEBUFFER, colorFrameBuffer);
	 gl.viewport(0,0,canvasWidth, canvasHeight);
	
	 render(makeFlat);
	 		 
}

function initSelectionComponents(){
	
	
 //Frame buffer and binding
	colorFrameBuffer = gl.createFramebuffer();
   gl.bindFramebuffer(gl.FRAMEBUFFER, colorFrameBuffer);

//bind the texture
	holdTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, holdTexture);

//texture
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvasWidth, canvasHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  
 //render buffer for depth
    renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvasWidth, canvasHeight);
    
    //
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, holdTexture, 0);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
	
	
}

function backToDefaultRender(){
	
	gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
}
function main(){
	
//obtain canvas and webgl context
var canvas = document.getElementById('canvas');
 gl =  canvas.getContext("webgl", {preserveDrawingBuffer: true});
 

 //set canvas mousedown 
canvas.onmousedown = mouseDownHandler;
canvas.onmouseup = mouseUpHandler;
canvas.onmousemove = mouseMoveHandler;
canvas.oncontextmenu = preventContextMenu;
canvas.ondblclick 	= selectObject;

//obtain the canvas width and height
canvasWidth = canvas.width;
canvasHeight = canvas.height;

//alow depth sensing
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
//get shaders and program

//create shader
var vShader = compileShader(gl, V_SHADER, gl.VERTEX_SHADER);
var fShader = compileShader(gl, F_SHADER, gl.FRAGMENT_SHADER);

//create program
program = createProgram(gl, vShader, fShader);

//must set use program
gl.useProgram(program );

var testTriangle = new Float32Array([ 0, 0, 0  , 10, 50 ,0 ,  50, 0 ,0]);

//create buffer
var vertexBuffer = gl.createBuffer(); // this is just a buffer objecr

//bind the buffer to be used for vertices
gl.bindBuffer(gl.ARRAY_BUFFER , vertexBuffer);

//also create index buffer and bind


var indexBuffer= gl.createBuffer();

//bind it to index buffer
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
//now we can send indices to this buffer. The only thing left now is to call the appropriate draw function


//now tell the a_position in vertex shader to know where to get vertices 
var a_position = gl.getAttribLocation(program , "a_position");

if (a_position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
var a_normal = gl.getAttribLocation(program , "a_normal");

if (a_normal < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
//must enable this location before using it... Yes the vertex attribute can be thought of as an array
gl.enableVertexAttribArray(a_position);
gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 24, 0); // This simply says we want 3 components

gl.enableVertexAttribArray(a_normal);
gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 24, 12); // This simply says we want 3 components

//obtain my new uniform
modelUniform  = gl.getUniformLocation(program, 'model');

projectMatLoc = gl.getUniformLocation(program, 'projectMat');

viewMatLoc = gl.getUniformLocation(program, 'viewMat');

surfaceCenterLoc = gl.getUniformLocation(program, 'surfaceCenter');

pointLightPosLoc = gl.getUniformLocation(program, 'pointLightPos');
 
//uniformNormalLoc = gl.getUniformLocation(program, 'faceNormal');

//get and set specular light
var specLightReflecLoc = gl.getUniformLocation(program, 'specLightReflec');

var specLight = new Float32Array([1.0,0.0,0.0]);
var specCoeff = new Float32Array([0.5,0.5,0.5]);


gl.uniform3f(specLightReflecLoc, specLight[0]*specCoeff[0] ,specLight[1] * specCoeff[1],specLight[1] * specCoeff[1]);

//white light, we can just use one float
var I_d = gl.getUniformLocation(program,'I_d');
gl.uniform1f(I_d, 1.0);


var k_d = gl.getUniformLocation(program,'k_d');
gl.uniform3f(k_d, 0.0,0.0,1.0);

//setup info for flat shading
flatNormalLoc = gl.getUniformLocation(program, 'flat_normal');
isFlatLoc = gl.getUniformLocation(program, 'isFlat');
shininessLoc = gl.getUniformLocation(program, 'a_shininess');
viewerDirectionLoc = gl.getUniformLocation(program, 'viewerDirection');
isLightLoc = gl.getUniformLocation(program, 'isLight');

gl.uniform3f(viewerDirectionLoc, 0,0,1);//use the normalized posive z of the cube..

isSelectionLoc = gl.getUniformLocation(program, 'isSelection');
colorCodeLoc = gl.getUniformLocation(program, 'colorCode');

halfVecLoc = gl.getUniformLocation(program, 'a_halfvector');
if (halfVecLoc < 0) {
    console.log('Failed to get the storage location of a_halfvector');
    return -1;
  }

diffuseLightDirLoc = gl.getUniformLocation(program, 'diff_light_direction');
gl.clearColor(backGroundColor[0], backGroundColor[1], backGroundColor[2], backGroundColor[3]);
gl.clearDepth(1.0); 
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

//put the cube representing the light
putLight();

}

function preventContextMenu(e){
	
	e.preventDefault();
	
}

function getWorldTranslationFromScreen(dx, dy){
	
	
	var dxdyWorld = new Float32Array([0,0]);
	var worldDiff = (minMaxXYZ[1] -minMaxXYZ[0])
	
	dxdyWorld[0] = ( worldDiff * dx)/(canvasWidth);
	dxdyWorld[1] = ( worldDiff * dy)/(canvasHeight);
	
	return dxdyWorld;
}


function mouseMoveHandler(e){
	
	
	if(mouseDownBool){
		
		switch(currentMode){
			
			case modes.TRANSLATE:
			dxdyWorld = getWorldTranslationFromScreen(e.movementX , e.movementY);
			newXYZTrans[currSelectedObj][0]+= dxdyWorld[0];
			newXYZTrans[currSelectedObj][1]+= dxdyWorld[1];
	
			render(makeFlat);
			break;
			
			case modes.ROTATE:					
			rotationXYZ[currSelectedObj][1]+= e.movementX;
			rotationXYZ[currSelectedObj][1] = rotationXYZ[currSelectedObj][1] >= 360 ? 0 : rotationXYZ[currSelectedObj][1];
			render(makeFlat);		
			
			break;
			
			case modes.SCALE:
			
			uniformScaleXYZArray[currSelectedObj] -= e.movementY /scaleNormalizer;
			
			uniformScaleXYZArray[currSelectedObj]  = uniformScaleXYZArray[currSelectedObj]  <= scaleLimit? scaleLimit : uniformScaleXYZArray[currSelectedObj];
					
			render(makeFlat);
			
			break;									
			
		}
				
		
	}
	
}



function mouseUpHandler(){
	

	currentMode = modes.DEFAULT;
	mouseDownBool = false;
}

function mouseDownHandler(e){
	
	var buttonPressed = e.button;
	
	switch(buttonPressed){
			
			case 0: //left mouse
			currentMode = modes.TRANSLATE;
			
			break;
			
			case 1: //Middle mouse
			currentMode = modes.SCALE;
			break;
			
			case 2: //right mouse
			currentMode = modes.ROTATE;	
			break;
			
			default:
			currentMode = modes.DEFAULT;
		
	}
	
	mouseDownBool = true;
	
}

function getClickedObjIndex(pseudoXY  , noObjects){
	
	//use rendering heirarchy to decide which object is in foreground or not
	for(var i=noObjects-2; i >= 0 ; i--){
	
	//use minMaxXYZ to decide which object was selected	
	if( (pseudoXY[0] <= minMaxXYZArray[i][1] && pseudoXY[0] >= minMaxXYZArray[i][0])  &&  (pseudoXY[1] <= minMaxXYZArray[i][3] && minMaxXYZArray[i][1] >= minMaxXYZArray[i][2]) ){
	
		return i; // the estimated selected object
	}
	
}	
	return -1; //-1 implies none
	

}

function selectObject(e){
    var rect = canvas.getBoundingClientRect();
    var mouseX = e.clientX  - rect.left; ;
    var mouseY = canvasHeight -  (e.clientY - rect.top);
   
    isSelection = true;

    render(makeFlat);
   
    var pixColor = new Uint8Array(4);
   
    gl.readPixels(mouseX, mouseY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixColor);
  
   
    for(var i=0; i<noObjects-1; i++){
       
        if(objColorCodes[i] == pixColor[0]){
            currSelectedObj = i;
            break;
        }
       
    }

    //switch back to normal drawing
    isSelection = false;
    gl.uniform1f(isSelectionLoc, 0.0);
    //backToDefaultRender();
    render(makeFlat);
   

}


function convertScreenToClip(canvasWidth , canvasHeight, clientX, clientY){
	
	var x = (2.0 * clientX) / canvasWidth - 1;
    var y = -(2.0 * clientY) / canvasHeight + 1;
		
	var pseudoXYZW = new Vector4( new Float32Array([x, y, 0, 1]));
	

	
	var transViewPers_inv = new Matrix4();
	transViewPers_inv.set(projMat);

	transViewPers_inv = transViewPers_inv.multiply(viewMat);
	transViewPers_inv = transViewPers_inv.multiply(modelMat);
	transViewPers_inv = transViewPers_inv.invert();
	
	pseudoXYZW = transViewPers_inv.multiplyVector4(pseudoXYZW);
				
	return new Float32Array([pseudoXYZW.elements[0]/pseudoXYZW.elements[3], pseudoXYZW.elements[1]/pseudoXYZW.elements[3]]);
}

function setShininess(shininessVal){
	
	shininess = +shininessVal.value;	
	render(makeFlat);
}


function setProjection(myRadio){
	
var projectionVal = +myRadio.value;	

	if(projectionVal == 0 && makeOrtho){
	return;
	}
	if(projectionVal == 1 && !(makeOrtho)){
	return;
	}
	if(projectionVal == 0 && !(makeOrtho)){
	makeOrtho = true;
	render(makeFlat);
	return;
	}
	if(projectionVal == 1 && makeOrtho){	
	makeOrtho = false;
	render(makeFlat);
	return;
	}
	
}

function setDiffuse(diffuseVal){
	
var diffusseVal = diffuseVal.checked;	

	if(diffusseVal && diffuseOnly){	
	return;
	}
	if(diffusseVal  && !(diffuseOnly)){
		diffuseOnly = true;
		render(makeFlat);
	return;
	}
	if(!(diffusseVal)  && !(diffuseOnly)){				
	return;
	}
	if(!(diffusseVal)  && diffuseOnly){	
		diffuseOnly = false;
		render(makeFlat);
	return;
	}
}

function setShaderAlgo(shaderType){
	
	var shaderVal = +shaderType.value;	

	if(shaderVal == 0 && makeFlat ==1 ){
	return;
	}
	if(shaderVal == 1 && makeFlat == 0){
	return;
	}
	if(shaderVal == 0 && makeFlat == 0){
	makeFlat = 1;
	render(makeFlat);
	return;
	}
	if(shaderVal == 1 && makeFlat == 1){	
	makeFlat = 0;
	render(makeFlat);
	return;
	}
}

function createModel(minMaxXYZA, objIndex){
	
		var minX = minMaxXYZA[0]; 
		var maxX = minMaxXYZA[1];
		var minY = minMaxXYZA[2];
		var maxY = minMaxXYZA[3];
		var minZ = minMaxXYZA[4];
		var maxZ = minMaxXYZA[5];
		
		//get the divisor for scaling the object
		var divisor = getDivisor(minMaxXYZA);
		
		//obtain the scale to use. We assume cube, which means same difference on xyz
		var scaleFactor = (minMaxXYZ[1] - minMaxXYZ[0])/divisor;
		
		var scaleMat = new Matrix4();
		
		//first scale to fit space. Then scale to fit user selected scale
		var worldUserScale = uniformScaleXYZArray[objIndex]*(scaleFactor/2);
		
		//set uniform scaling on all axis of object.. world
		scaleMat.setScale(worldUserScale, worldUserScale, worldUserScale);
				
		
	    var translateMat = new Matrix4(); //arbitrary translation
	    var translateOriginMat = new Matrix4(); //tanslate to origin
	   
	    translateOriginMat.setTranslate(-(maxX + minX)/2  , -(maxY + minY)/2 , -(maxZ + minZ)/2 );
	   
	    translateMat.setTranslate(newXYZTrans[objIndex][0]  , - newXYZTrans[objIndex][1]  ,  newXYZTrans[objIndex][2] );
			
		var rotationMat = new Matrix4();
		
		//implemented for only y-axis
	    rotationMat.setRotate(rotationXYZ[objIndex][1], 0,1,0);

	    rotationMat.multiply(translateOriginMat);
	    	    
	    scaleMat.multiply(rotationMat);
	    
	    
	    translateMat.multiply(scaleMat);	      
	    
		return translateMat;
	
}


function getDivisor(minMaxXYZ){
	
	
	diffX = minMaxXYZ[1] - minMaxXYZ[0]; 
	diffY = minMaxXYZ[3] - minMaxXYZ[2];
	diffZ = minMaxXYZ[5] - minMaxXYZ[4];
	
	
	var divisor = Math.max(Math.max(diffX, diffY), diffZ);
	
	return divisor;
}


function getFrustrum(minMaxXYZ){
	
	//to preserve aspect Ratio we use the maximum

	
	diffX = minMaxXYZ[1] - minMaxXYZ[0]; 
	diffY = minMaxXYZ[3] - minMaxXYZ[2];
	diffZ = minMaxXYZ[5] - minMaxXYZ[4];
	 
	var maxDiff =  Math.max(Math.max(diffX, diffY), diffZ);
	var minVol =0;
	var maxVol =0;
	
	switch(maxDiff){
		
		case diffX:
			minVol = -diffX / 2 ;
			maxVol =  diffX / 2 ;
		break;
		
		case diffY:
			minVol = -diffY / 2 ;
			maxVol =  diffY / 2 ;
			
			break;
			
		case diffZ:
			minVol = -diffZ / 2 ;
			maxVol =  diffZ / 2 ;
			
			break;
			
	}
	
	//we define the bounding box based on the maximum difference and then translate it

	return new Float32Array([minVol, maxVol]);
}


//we use the javascript for each function

function fileReadFunc(){
			var polyFile;
			var coorFile;
			var file1 = document.getElementById("fileReadInput").files[0];
			var file2 = document.getElementById("fileReadInput").files[1];
		
		//check for undefined	
			if(!file2 || !file1){
				
				throw "two files required";
			}
			
			var fileExt1 = file1.name.split('.').pop();
			var fileExt2 = file2.name.split('.').pop();
		
		//quick validity check	
			if(fileExt1.charAt(0) == 'c' && fileExt2.charAt(0) != 'p') throw "we need file with poly and coor extension"
			if(fileExt1.charAt(0) == 'p' && fileExt2.charAt(0) != 'c') throw "we need file with poly and coor extension"
			if(fileExt1.charAt(0) != 'c' && fileExt2.charAt(0) != 'c') throw "we need file with poly and coor extension"
			if(fileExt1.charAt(0) != 'p' && fileExt2.charAt(0) != 'p') throw "we need file with poly and coor extension"
			
			//assume ccor file is file 1 and polyfile is file 2
			coorFile = file1;
			polyFile = file2;
			
			//swap assumption
			if(fileExt1.charAt(0) == 'p') {
			
				polyFile = file1;
				coorFile = file2;
		}

/*********************************** COOR FILE ************************************/
			cReader = new FileReader();
			
				//after the read is complete we need to call the onload function.. ensure it has finished loading before trying to use it
				cReader.onload = function(){
				//get all lines and store in array
				var dynamic_vertex = cReader.result.match(/[+-]?\d+(\.\d+)?/g);				
				
				
				noVertices = dynamic_vertex.shift();
				 				
				//wait and ensure prevous file has been read
				
				extractedVerticesAndColor = Float32Array.from(dynamic_vertex);
				
				//check if it is the first object before updating
				if(noObjects == 1)
					minMaxXYZArray[0] = getMinMaxXYZ(extractedVerticesAndColor, noVertices);				
				else
					minMaxXYZArray.push(getMinMaxXYZ(extractedVerticesAndColor, noVertices));
					
					
				//update global minMaxXYZ
				//minMaxXYZ = updateMinMaxXYZ(noObjects , minMaxXYZArray);							
			
/*********************************** POLY FILE --Contained in onload of .COOR file, as it needs data from it ************************************/					
			
			pReader = new FileReader();
			
			//after the read is complete we need to call the onload function.. ensure it has finished loading before trying to use it
			pReader.onload = function(){
				//get all lines and store in array
				
			 dynamic_index = pReader.result.split('\n');
				
			 var noFaces = dynamic_index[0];
			
			//declare and initialize normal matrix
			normalMat = new Float32Array(newVertices.length);
			normalMat.fill(0.0);
			
			//initialize array for flat shading normals
			var normalForFlat = new Float32Array(noFaces * 3);
			var surfacePositionForFlat = new Float32Array(noFaces * 3);
			
		//declare temporary buffer for index data perline
		var indexArrayPerface = new Array(noFaces);
		
		//new implementation
		for(var j = 1; j <=noFaces; j++){
			
			
			//get the extracted inidices
			var extractedSplit = dynamic_index[j].match(/\s\d+/g);//.split(" ");					
		
			var greaterThan3 = false;
			
			if(extractedSplit.length > 3){
			greaterThan3 =  true;
			extractedSplit.push("0");
			
		}
			var extractedIndices = Uint16Array.from(extractedSplit);

			//do the shift		
			for(var i =0; i < extractedIndices.length ; i++){
					
				extractedIndices[i] = extractedIndices[i]-1;			
					
			}			
			
			if(greaterThan3){
			extractedIndices[extractedIndices.length - 1] = extractedIndices[0];
		}
				//store the extracted indices per face
				indexArrayPerface[j - 1] = extractedIndices;
				
				
				faceNormal = getFaceNormal(extractedIndices, newVertices);
				var actInd = (j-1)*3;
				//store this normal for the face
				normalForFlat[actInd] = faceNormal[0];
				normalForFlat[actInd + 1] = faceNormal[1];
				normalForFlat[actInd + 2] = faceNormal[2];
				
				//estimate the surface position, for point light
				estimatedPos = estimateSurfaceCenter(extractedIndices, newVertices);
				surfacePositionForFlat[actInd] 	   = estimatedPos[0];
				surfacePositionForFlat[actInd + 1] = estimatedPos[1];
				surfacePositionForFlat[actInd + 2] = estimatedPos[2];
				
				//for each of the faces of the polygon add up the normals correspoding to the vertices
				for(var p = 0; p< extractedIndices.length; p++){
					
					var p3 = extractedIndices[p]*3;
					
					normalMat[p3] 	+= faceNormal[0];
					normalMat[p3+1] += faceNormal[1];
					normalMat[p3+2] += faceNormal[2];
					
				}			
				
		}
		
		//Assign the currently parsed vertices
		if(noObjects == 1) objectIndexArray[0] = indexArrayPerface;
		else objectIndexArray.push(indexArrayPerface);
		
		//store the normal for flat shading
		if(noObjects == 1) normalForFlatArray[0] = normalForFlat;
		else normalForFlatArray.push(normalForFlat);
		
		//store the surface for flat shading
		if(noObjects == 1) surfaceCenterForFlatArray[0] = surfacePositionForFlat;
		else surfaceCenterForFlatArray.push(surfacePositionForFlat);
		
		//Store the noFaces per object
		if(noObjects == 1) noFacesArray[0] = noFaces;
		else noFacesArray.push(noFaces);
		
		//Initialize translation for the object to zero
		if(noObjects == 1) newXYZTrans[0] = new Float32Array([0,0,0]);
		else newXYZTrans.push(new Float32Array([0,0,0]));
		
		//Initialize translation for the object to zero
		if(noObjects == 1) uniformScaleXYZArray[0] = 1.0;
		else uniformScaleXYZArray.push(1.0);
		
		
		//Initialize Rotatation for the object to zero
		if(noObjects == 1) rotationXYZ[0] = new Float32Array([0,0,0]);
		else rotationXYZ.push(new Float32Array([0,0,0]));
		
		//Initialize Model MAtrix for the object for the object to zero
		modelMatArray.push(new Matrix4());
				
		
		//create new array to have the correct information
		 var verticesAndnormals = new Float32Array(2*newVertices.length);
		
		var m =0;
		for(var p = 0; p < verticesAndnormals.length; p+=6 ){
			
			verticesAndnormals[p] =   newVertices[m];
			verticesAndnormals[p+1] = newVertices[m+1];
			verticesAndnormals[p+2] = newVertices[m+2];
			verticesAndnormals[p+3] = normalMat[m];
			verticesAndnormals[p+4] = normalMat[m+1];
			verticesAndnormals[p+5] = normalMat[m+2];
		
			m+=3;
		}
		
		//send into out buffer
		if(noObjects == 1)objectVerticesArray[0] = verticesAndnormals;
		else objectVerticesArray.push(verticesAndnormals);
		
		noObjects++; // increment noObject			
		
		render(makeFlat);				
		
	}
			
			//read the text file
			pReader.readAsText(polyFile);				
			
				
}
			
			//read the text file
			cReader.readAsText(coorFile);
			
}
		
function putLight(){
	
				noVertices = 8;
				 				
				//wait and ensure prevous file has been read
				
				extractedVerticesAndColor = cubeCoor;
				
				//check if it is the first object before updating
				if(noObjects == 1)
					minMaxXYZArray[0] = getMinMaxXYZ(extractedVerticesAndColor, noVertices);				
				else
					minMaxXYZArray.push(getMinMaxXYZ(extractedVerticesAndColor, noVertices));
		
			 var noFaces = 6;
			
			//declare and initialize normal matrix
			normalMat = new Float32Array(newVertices.length);
			normalMat.fill(0.0);
			
			//initialize array for flat shading normals
			var normalForFlat = new Float32Array(noFaces * 3);
			var surfacePositionForFlat = new Float32Array(noFaces * 3);
			
		//declare temporary buffer for index data perline
		var indexArrayPerface = new Array(noFaces);
		
		//new implementation
		for(var j = 1; j <=noFaces; j++){
			
			
			//get the extracted inidices
			var extractedIndices = new Uint16Array(5);			
			var jumper = (j-1)*4;
		
			extractedIndices[0] = cubePoly[jumper] -1; 
			extractedIndices[1] = cubePoly[jumper + 1] - 1;
			extractedIndices[2] = cubePoly[jumper + 2] - 1;
			extractedIndices[3] = cubePoly[jumper + 3] - 1;
			extractedIndices[4] = cubePoly[jumper] - 1;		
			
			//store the extracted indices per face
				indexArrayPerface[j - 1] = extractedIndices;
				
				
				faceNormal = getFaceNormal(extractedIndices, newVertices);
				var actInd = (j-1)*3;
				//store this normal for the face
				normalForFlat[actInd] = faceNormal[0];
				normalForFlat[actInd + 1] = faceNormal[1];
				normalForFlat[actInd + 2] = faceNormal[2];
				
				//estimate the surface position, for point light
				estimatedPos = estimateSurfaceCenter(extractedIndices, newVertices);
				surfacePositionForFlat[actInd] 	   = estimatedPos[0];
				surfacePositionForFlat[actInd + 1] = estimatedPos[1];
				surfacePositionForFlat[actInd + 2] = estimatedPos[2];
				
				//for each of the faces of the polygon add up the normals correspoding to the vertices
				for(var p = 0; p< extractedIndices.length; p++){
					
					var p3 = extractedIndices[p]*3;
					
					normalMat[p3] 	+= faceNormal[0];
					normalMat[p3+1] += faceNormal[1];
					normalMat[p3+2] += faceNormal[2];
					
				}			
				
		}
		
		//Assign the currently parsed vertices
		if(noObjects == 1) objectIndexArray[0] = indexArrayPerface;
		else objectIndexArray.push(indexArrayPerface);
		
		//store the normal for flat shading
		if(noObjects == 1) normalForFlatArray[0] = normalForFlat;
		else normalForFlatArray.push(normalForFlat);
		
		//store the surface for flat shading
		if(noObjects == 1) surfaceCenterForFlatArray[0] = surfacePositionForFlat;
		else surfaceCenterForFlatArray.push(surfacePositionForFlat);
		
		//Store the noFaces per object
		if(noObjects == 1) noFacesArray[0] = noFaces;
		else noFacesArray.push(noFaces);
		
		//Initialize translation for the cube to 0.5,0.5,0.5
		if(noObjects == 1) newXYZTrans[0] = new Float32Array([0.5,0.5,0.5]);
		else newXYZTrans.push(new Float32Array([0,0,0]));
		
		//Initialize translation for the object to zero
		if(noObjects == 1) uniformScaleXYZArray[0] = 0.05;
		else uniformScaleXYZArray.push(1.0);
		
		
		//Initialize Rotatation for the object to zero
		if(noObjects == 1) rotationXYZ[0] = new Float32Array([0,0,0]);
		else rotationXYZ.push(new Float32Array([0,0,0]));
		
		//Initialize Model MAtrix for the object for the object to zero
		modelMatArray.push(new Matrix4());
				
		
		//create new array to have the correct information
		 var verticesAndnormals = new Float32Array(2*newVertices.length);
		
		var m =0;
		for(var p = 0; p < verticesAndnormals.length; p+=6 ){
			
			verticesAndnormals[p] =   newVertices[m];
			verticesAndnormals[p+1] = newVertices[m+1];
			verticesAndnormals[p+2] = newVertices[m+2];
			verticesAndnormals[p+3] = normalMat[m];
			verticesAndnormals[p+4] = normalMat[m+1];
			verticesAndnormals[p+5] = normalMat[m+2];
		
			m+=3;
		}
		
		//send into out buffer
		if(noObjects == 1)objectVerticesArray[0] = verticesAndnormals;
		else objectVerticesArray.push(verticesAndnormals);
		
		noObjects++; // increment noObject			
		
		render(makeFlat);				

	
}
		
function render(isFlat){


	//gl.clearColor(backGroundColor[0], backGroundColor[1], backGroundColor[2], backGroundColor[3]);
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.clearDepth(1.0); 
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	//send in the point light location.. use the position of the cube
	gl.uniform3fv(pointLightPosLoc, newXYZTrans[0]);
	
for(var i = 0; i<noObjects-1; i++){
	
	if(isSelection){
	//send the color for the uniform	
	gl.uniform1f(isSelectionLoc, 1.0);	
	gl.uniform1f(colorCodeLoc , objColorCodes[i]/255.0);
		
	}
	//if its cube don't use point light
	if(i==0) gl.uniform1f(isLightLoc, 1.0);
	else gl.uniform1f(isLightLoc, 0.0);
	
//first send in the appropriate buffer data
	gl.bufferData(gl.ARRAY_BUFFER, objectVerticesArray[i], gl.STATIC_DRAW);	
	
//create the model for the object
//send for translation
	modelMat = createModel(minMaxXYZArray[i], i);
	gl.uniformMatrix4fv(modelUniform, false, modelMat.elements);
	
	//update modelMatArray
	modelMatArray[i].set(modelMat);
	
if(diffuseOnly){
			//calculate the new half vector
	halfVector[0] = 0.0;
	halfVector[1] = 0.0;
	halfVector[2] = 0.0;
	}else{
	//calculate the new half vector
	halfVector[0] = viewerDirection[0] + specularDirection[0];
	halfVector[1] = viewerDirection[1] + specularDirection[1];
	halfVector[2] = viewerDirection[2] + specularDirection[2];

	//set the shininess
	gl.uniform1f(shininessLoc, shininess);
}
	//send the new half vector in
	gl.uniform3fv(halfVecLoc, halfVector);

	                 	                 	      
	//send diffuse light direction
	gl.uniform3fv(diffuseLightDirLoc, diffuseDirection);                 	      
	                 	                 	                 
	//set if Flat or not
	gl.uniform1f(isFlatLoc, makeFlat);
		
	//ortho
	var authoParameter = getFrustrum(minMaxXYZ);
			
	//set projection	
		if(makeOrtho){
			
			//set identity for the view matrix
			viewMat = new Matrix4();
			viewMat.setIdentity();
			gl.uniformMatrix4fv(viewMatLoc, false, viewMat.elements);
				
			projMat = new Matrix4();
			projMat.setOrtho(authoParameter[0], authoParameter[1], authoParameter[0], authoParameter[1], authoParameter[0], authoParameter[1]);
		    gl.uniformMatrix4fv(projectMatLoc, false, projMat.elements);
		    
		}else{
			
			//view	
			//update eyeZ based on the object's new max Z after translation
			eyeZ = authoParameter[1]*2;		
			viewMat = new Matrix4();
			viewMat.setLookAt(eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ);
			gl.uniformMatrix4fv(viewMatLoc, false, viewMat.elements);
		
			
			//perspective
			projMat = new Matrix4();			
			//we have to determine near and far based on where the user is
			projMat.setPerspective(fovy, aspect, 1, far)
			//persMat.setFrustum(authoParameter[0], authoParameter[1], authoParameter[0], authoParameter[1],  10, far);
			gl.uniformMatrix4fv(projectMatLoc, false, projMat.elements);			
		}
	
	
	//flat shading
	if(isFlat > 0.5){
		
		
	var m;

			
			
			for(var j = 1; j <=noFacesArray[i]; j++){
	
			var extractedIndices = objectIndexArray[i][j-1]; 
			
	
				 m = (j-1)*3;
				
				normalizedVecParameter = new Float32Array([normalForFlatArray[i][m],normalForFlatArray[i][m+1],normalForFlatArray[i][m+2]]);
				surfaceCenterParameter = new Float32Array([surfaceCenterForFlatArray[i][m],surfaceCenterForFlatArray[i][m+1],surfaceCenterForFlatArray[i][m+2]]);
					
				//set the Normal for the face
				gl.uniform3fv(flatNormalLoc, normalizedVecParameter);
				
				//set position of the face...
				gl.uniform3fv(surfaceCenterLoc, surfaceCenterParameter);
		
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,extractedIndices, gl.STATIC_DRAW);
				
				
				//draw data
			    gl.drawElements(gl.TRIANGLE_STRIP, extractedIndices.length, gl.UNSIGNED_SHORT, 0);
				
		}
		

	}else{//smooth shading
		
		var m =0;
	
		//now reprocess for drawing per vertex
		for(var j = 1; j <=noFacesArray[i]; j++){
							
				var extractedIndices = objectIndexArray[i][j-1]; 
				
				//Send vertex index to be drawn
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,extractedIndices, gl.STATIC_DRAW);
				
				
				//draw data
			    gl.drawElements(gl.TRIANGLE_STRIP, extractedIndices.length, gl.UNSIGNED_SHORT, 0);
								
		}		
		
	}
	
}
	
}

function estimateSurfaceCenter(tempIndexArray, extractedVertices){
	
	var aveX =0;
	var aveY =0;
	var aveZ =0;
	var actInd = 0;
	
	for(var i=0; i < tempIndexArray.length; i++){
		
		actInd = tempIndexArray[i] * 3;
		aveX += extractedVertices[actInd];
		aveY += extractedVertices[actInd+1];
		aveZ += extractedVertices[actInd+2];
		
	}
	
	aveX/=tempIndexArray.length;
	aveY/=tempIndexArray.length;
	aveZ/=tempIndexArray.length;
	
	return new Float32Array([aveX, aveY, aveZ]);
	
}
		

function getFaceNormal(tempIndexArray, extractedVertices){
	
	var vertexIndexXYZ1 = tempIndexArray[0] * 3;
    var vertexIndexXYZ2 = tempIndexArray[1] * 3;
    var vertexIndexXYZ3 = tempIndexArray[2] * 3;

	
	var Ax = extractedVertices[vertexIndexXYZ1];
	var Ay = extractedVertices[vertexIndexXYZ1 + 1];
	var Az = extractedVertices[vertexIndexXYZ1 + 2];
	
	var Bx = extractedVertices[vertexIndexXYZ2];
	var By = extractedVertices[vertexIndexXYZ2 + 1];
	var Bz = extractedVertices[vertexIndexXYZ2 + 2];
	
	
	var Cx = extractedVertices[vertexIndexXYZ3];
	var Cy = extractedVertices[vertexIndexXYZ3 + 1];
	var Cz = extractedVertices[vertexIndexXYZ3 + 2];
	
	
	//B-A
	var BAx = Bx - Ax;
	var BAy = By - Ay;
	var BAz = Bz - Az;
	
	//C-A
	var CAx = Cx - Ax;
	var CAy = Cy - Ay;
	var CAz = Cz - Az;



//A-B
	var ABx = Ax - Bx;
	var ABy = Ay - By;
	var ABz = Az - Bz;
	
	//C-B
	var CBx = Cx - Bx;
	var CBy = Cy - By;
	var CBz = Cz - Bz;

/*	
	//(B-A)  X (C-A) => BA  X  CA
	
	var nX = BAy * CAz - BAz * CAy;
	var nY = BAz * CAx - BAx * CAz;
	var nZ = BAx * CAy - BAy * CAx;
	* 
	* */
	//C-B X B-A
	
	var nX = CBy * ABz - CBz * ABy;
	var nY = CBz * ABx - CBx * ABz;
	var nZ = CBx * ABy - CBy * ABx;
	
	//console.log("^^" + BAx + "^^" + BAy + "^^" + BAz);
	//console.log("^^" + CAx + "^^" + CAy + "^^" + CAz);
	//console.log("^^" + nX + "^^" + nY + "^^" + nZ);
	
	//get magnitude of the normal
	var mag = Math.sqrt(nX*nX + nY*nY + nZ*nZ);
	
	
	//normalize
	nX = nX/mag;
	nY = nY/mag;
	nZ = nZ/mag;
	 
	
	
	faceNormal = new Float32Array([nX, nY, nZ]);
	
	return faceNormal;
	
	
}

function normalizeVec3(nX, nY, nZ){
	
	var mag = Math.sqrt(nX*nX + nY*nY + nZ*nZ);
	
	//normalize
	nX = nX/mag;
	nY = nY/mag;
	nZ = nZ/mag;
	
	var normalized = new Float32Array([nX, nY, nZ]);
	
	return normalized;
}

function getMinMaxXYZ(verticesArray , noVertices){
	
	newVertices = new Float32Array(verticesArray.length - noVertices); // discard the preceding indices
	
	var minX;
	var maxX;
	var minY;
	var maxY;
	var minZ;
	var maxZ;


	minX = verticesArray[1];
	maxX = minX;
	minY = verticesArray[2];
	maxY = minY;
	minZ = verticesArray[3];
	maxZ = minZ;
	
	var i=3;
	
	newVertices[0] = verticesArray[1];
	newVertices[1] = verticesArray[2];
	newVertices[2] = verticesArray[3];
	
	
	
	var j=2;
	
	while( ++i< verticesArray.length){ //discard the vertex index number
		
		
		var xLocal = verticesArray[++i] //x		
		var yLocal = verticesArray[++i] //y
		var zLocal = verticesArray[++i] //z
			
	//allocate values for the new vertices
	newVertices[++j] = xLocal;
	newVertices[++j] = yLocal;
	newVertices[++j] = zLocal;
	
	
	//check for minmx
	if(xLocal < minX) minX = xLocal;
	if(yLocal < minY) minY = yLocal;
	if(zLocal < minZ) minZ = zLocal;
	
	if(xLocal > maxX) maxX = xLocal;
	if(yLocal > maxY) maxY = yLocal;
	if(zLocal > maxZ) maxZ = zLocal;
	
	}

	var	minMaxXYZ = new Float32Array([ minX, maxX, minY, maxY, minZ, maxZ ]);
	
	return minMaxXYZ;

}

function updateMinMaxXYZ(noObjects , minMaxXYZArray){
	
	var minX;
	var maxX;
	var minY;
	var maxY;
	var minZ;
	var maxZ;
	
	
	minX = minMaxXYZArray[0][0];
	maxX = minMaxXYZArray[0][1];
	minY = minMaxXYZArray[0][2];
	maxY = minMaxXYZArray[0][3];
	minZ = minMaxXYZArray[0][4];
	maxZ = minMaxXYZArray[0][5];
	
	
	for(var i= 0; i<noObjects ; i++){
		
		if(minMaxXYZArray[i][0] < minX) minX = minMaxXYZArray[i][0];
		if(minMaxXYZArray[i][2] < minY) minY = minMaxXYZArray[i][2];
		if(minMaxXYZArray[i][4] < minZ) minZ = minMaxXYZArray[i][4];
		
		if(minMaxXYZArray[i][1] > maxX) maxX = minMaxXYZArray[i][1];
		if(minMaxXYZArray[i][3] > maxY) maxY = minMaxXYZArray[i][3];
		if(minMaxXYZArray[i][5] > maxZ) maxZ = minMaxXYZArray[i][5];
		
	}
	
	var	minMaxXYZ = new Float32Array([ minX, maxX, minY, maxY, minZ, maxZ ]);
	
	return minMaxXYZ;
	
}
