function CordovaAppConstructor()
{
	var _initialize = function()
	{
		document.addEventListener('deviceready', _onDeviceReady, false);
	};

	var _onDeviceReady = function()
	{
		document.addEventListener('menubutton', _onMenuButton, false);
		document.addEventListener("backbutton", _onBackButton, false);

		System.initialize(function(){ Library.start(); });
	};

	var _onMenuButton = function()
	{
		Library.showMenu();
	};

	var _onBackButton = function()
	{
		// nascondo il menù se è aperto o sospendo il libro se è aperto
		if(!Library.backMenu())
		{
			// esco dall'applicazione
			navigator.app.exitApp();
        }
	};

	this.initialize = _initialize;
}

CordovaApp = new CordovaAppConstructor();