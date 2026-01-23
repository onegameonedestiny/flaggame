

const scriptsInEvents = {

	async 共用_Event2(runtime, localVars)
	{
		runtime.JS_ListenRoomStatus()
	},

	async 共用_Event8_Act1(runtime, localVars)
	{
		runtime.JS_GetElapsedTime(runtime.globalVars.sofartime)
	},

	async 班長等待_Event2(runtime, localVars)
	{
		runtime.JS_GM_StartLevel("2")
	},

	async 顯示房_Event7_Act1(runtime, localVars)
	{
		runtime.JS_GM_Reset()
	}
};

globalThis.C3.JavaScriptInEvents = scriptsInEvents;
