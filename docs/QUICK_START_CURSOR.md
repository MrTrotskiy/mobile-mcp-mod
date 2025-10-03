# 🚀 Quick Start - MobilePixel in Cursor

## Current Problem

Cursor tries to run `npx -y @mobilepixel/mcp@latest` and gets an error:
```
npm ERR! Cannot set properties of null (setting 'peer')
```

**Reason**: NPM package is not yet published. You need to use the local version.

---

## ✅ Solution (3 Steps)

### Step 1: Build Project

Project is already built, but if you need to rebuild:
```bash
npm run build
npm run fixlint
```

**Result**: Creates `lib/` folder with compiled code.

---

### Step 2: Configure MCP Server ✅

**THE RIGHT WAY** - use global configuration:

1. **Find the MCP config file**:
   ```
   C:\Users\YOUR_USERNAME\AppData\Roaming\Cursor\User\globalStorage\cursor.mcp\mcp.json
   ```

2. **Open this file and add `mobilepixel` server**:
   ```json
   {
     "mcpServers": {
       "mobilepixel": {
         "command": "node",
         "args": ["C:\\Code\\mobilepixel\\lib\\index.js"]
       }
     }
   }
   ```

3. **Save the file**

**Why this way?**
- ✅ Works from **ANY project** you open in Cursor
- ✅ Uses absolute path (no confusion with `${workspaceFolder}`)
- ✅ One configuration, works everywhere

**⚠️ DON'T use project-level `.cursor/mcp.json`** - it won't work when you open other projects!

---

### Step 3: Restart Cursor

**Important**: You need a FULL restart!

1. Close Cursor completely (not just the window)
2. Open Cursor again
3. MCP servers will load automatically

---

## 🧪 Verification

After restarting Cursor:

1. **Check MCP logs**:
   - View → Output → Select "MCP"
   - Should see: `Starting new stdio process with command: node`
   - Should NOT see: `npx -y @mobilepixel/mcp@latest`

2. **Test in chat**:
   ```
   Show installed apps on device
   ```
   
   Should display list of applications on device 843b3cd3.

---

## ❌ If Not Working

### Problem: "No server info found"

**Solution**:
1. Verify `lib/index.js` exists: `dir lib\index.js`
2. Rebuild project: `npm run build`
3. Restart Cursor COMPLETELY

### Problem: "Cannot find module 'c:\OtherProject\lib\index.js'"

**This means you did Step 2 WRONG!**

You probably created `.cursor/mcp.json` with `${workspaceFolder}` - that doesn't work!

**Correct solution**:

1. **Delete** any `.cursor/mcp.json` files from all projects

2. **Edit the REAL MCP config**:
   ```
   C:\Users\YOUR_USERNAME\AppData\Roaming\Cursor\User\globalStorage\cursor.mcp\mcp.json
   ```

3. **Add mobilepixel with ABSOLUTE path**:
   ```json
   {
     "mcpServers": {
       "mobilepixel": {
         "command": "node",
         "args": ["C:\\Code\\mobilepixel\\lib\\index.js"]
       }
     }
   }
   ```

4. **Restart Cursor** completely

### Problem: Device not found

**Solution**:
```bash
# Check device connection
adb devices

# If no devices - restart ADB
adb kill-server
adb start-server
adb devices
```

---

## 📋 Summary

✅ Project built (`lib/` folder exists)  
✅ MCP config file edited: `cursor.mcp\mcp.json`  
✅ Used ABSOLUTE path, not `${workspaceFolder}`  
✅ Cursor fully restarted  
✅ Device connected (`adb devices`)  

**Ready! MCP now works from ANY project in Cursor.** 🎉

---

## 📚 Full Documentation

- `docs/AI_INTEGRATION_GUIDE.md` - Detailed integration guide
- `docs/MCP_SERVER_SETUP.md` - Detailed server setup
- `docs/AI_AGENT_INSTRUCTIONS.md` - Development instructions
- `MCP_FIXES_QUICKSTART.md` - Recent fixes and improvements (v1.1.0)
- `PERFORMANCE_IMPROVEMENTS_SUMMARY.md` - 3-7x performance improvements
- `README.md` - Project overview

## 🎉 What's New in v1.1.0

- ⚡ **5 New MCP Tools**: OCR, batch operations, loading detection
- 🚀 **3-7x Performance**: OCR Fast Mode, Worker Pool, Image Cache
- 🔍 **OCR Integration**: Find text that accessibility API misses
- 📦 **94+ Tools**: Now with enhanced mobile automation

---

**Date**: October 2, 2025  
**Version**: 1.1.0

