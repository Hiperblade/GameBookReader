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

		App.initialize(function(){ Library.start(); });
	};

	var _onMenuButton = function()
	{
		Library.showMenu();
	};

	var _onBackButton = function()
	{
		// nascondo il menù se è aperto
		if(!Library.hideMenu())
		{
			// sospendo il libro se è aperto
			if(!Library.suspendBook())
			{
				// esco dall'applicazione
				navigator.app.exitApp();
			}
		}
	};

	this.initialize = _initialize;
}

cordovaApp = new CordovaAppConstructor();