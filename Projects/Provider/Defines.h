/************************************************************

Copyright (c) 2020 weLees L.L.C. All Rights Reserved

Module Name:

    Defines.h

Abstract:

    To define interfaces / structures of object provider of weLees Blue Print.
	All provider followed this interface can work for weLees Blue Print

Author:

    Ares Lee 2020

Environment:

    Windows / Linux

Notes:

Revision History:
    1.0 New Release  2020-12-03

************************************************************/


#pragma once

#pragma pack(push)
#pragma pack(1)

#ifndef BOOLEAN
#define BOOLEAN char
#endif //BOOLEAN


#define _WBDP_MAJOR 1    //weLees Blue Print Data Provider Protocol 1.0
#define _WBDP_MINOR 1


//Service function, custom provider should declare function 'UINT32 ServiceEntry(IN UINT16 uCommand,IN PVOID pParameter)' to handle request
typedef UINT32 (*ServiceRoutine)(IN UINT16 uCommand,IN PVOID pParameter);


#define _COMMAND_SHAKE_HAND         0  //To shake with Editor and report provider information
typedef struct _SHAKE_HAND
{
	UINT16 MajorVersion,MinorVersion;  //IN OUT The server uses these 2 members to specify the version of the protocol used by the server
                                       //       The provider returns the protocol version number used by the provider
	
	UINT32 Features;
#define _PROXY_FEATURE_WRITE  1        //OUT  User can write data into objects
#define _PROXY_FEATURE_SEARCH 2        //OUT  User can do searching operation in objects
	UINT16 Type;
#define _PROXY_TYPE_SOLID_DEVICE_PROVIDER     1  //The data of object provided by current provider is solid for long time, such as disk/file
#define _PROXY_TYPE_VIOLATILE_DEVICE_PROVIDER 2  //The data of object provided by current provider is volatile for one time, such as networks package
	CHAR   Name[32];                   //OUT  Name of provider
	CHAR   Description[256];           //OUT  Provider description
	CHAR   Vendor[256];                //OUT  Vendor of provider
}SHAKE_HAND,*PSHAKE_HAND;


#define _COMMAND_ENUM_DEVICE           1  //To enum objects belongs to provider
typedef struct _DEVICE_NAME
{
//	UINT32 ID;                         //OUT   To identify an object uniquely, it is provided by provider, the editor will access object with it
	char    Name[256];
	char    Desc[1024];                 //OUT   Object showing name, such as "Disk X" / "Volume X" or filename.
	BOOLEAN Folder;                     //OUT   If the object is a folder
}DEVICE_NAME,*PDEVICE_NAME;


//weLees editor send this structure to enumerate object
typedef struct _ENUM_DEVICE
{
	CHAR        Path[1024];           //IN     The path user want to enumerate, for non-first enumerating, this parameter maybe empty
	UINT64      Handle;               //IN OUT The enumerating handle, it defined by provider, the editor just use it. The editor/provider use it to continue enumerating. provider should update it with enumerating operation return.
	UINT16      RequestCount;         //IN     Object count that the editor queried.
	UINT16      ReturnCount;          //OUT    The count of objects returned by provider.
	DEVICE_NAME Result[1];            //OUT    The object informations
}ENUM_DEVICE,*PENUM_DEVICE;


#define _COMMAND_GET_DEVICE_PROFILE    2  //To get profile of object will be edit


typedef struct _QUERY_DEVICE_PROFILE
{
	char   Name[1024];                 //IN    The id of object returned in DEVICE_NAME::ID
	UINT64 Bytes;                      //OUT   The total size in bytes of object
	UINT32 SectorSize;                 //OUT   The sector/block size of object, it should be set to 1 for character object
	UINT32 Features;
#define _DEVICE_FEATURE_BLOCK_DEVICE   1
#define _DEVICE_FEATURE_RESIZABLE      2
#define _DEVICE_FEATURE_READ_ONLY      4
#define _DEVICE_FEATURE_VOLATILE       8
	char   Description[1024];          //OUT   Object information
}QUERY_DEVICE_PROFILE,*PQUERY_DEVICE_PROFILE;


#define _COMMAND_READ                  3  //Read operation
#define _COMMAND_WRITE                 4  //Write operation


//The read/write operation use the same structure
typedef struct _ACCESS_PARAM
{
	char   Name[1024];                 //IN    The id of object returned in DEVICE_NAME::ID
	UINT64 ByteOffset;                 //IN    The byte offset of data will be read/write
	PUINT8 Buffer;                     //IN    The data
	UINT32 Size;                       //IN    The size of data will be handled
}ACCESS_PARAM,*PACCESS_PARAM;


#define _COMMAND_SEARCH                5  //To search data


typedef struct _SEARCH_ITEM
{
	UINT64       BlockOffset;
	vector<UINT> CaseOffsetInBlock;
	PUINT8       BlockData;
}SEARCH_ITEM,*PSEARCH_ITEM;


typedef struct _SEARCH_RESULT
{
	UINT64              CurrentOffset; //OUT   The searching position
	UINT32              ErrorCode;
	UINT16              TaskID;        //OUT   The searching ID, front-end should use it to query result
	UINT8               Status;        //OUT   1 means search operation stopped
#define _SEARCH_STATUS_STOPPED  1      //Searching task stopped
#define _SEARCH_STATUS_STOPPING 2      //Searching task is been stopping
	UINT8               MatchedCount;
	vector<SEARCH_ITEM> MatchItems;
#ifdef _WIN32
	LONG                Lock;
#else //_WIN32
	pthread_spinlock_t  Lock;
#endif //_WIN32
}SEARCH_RESULT,*PSEARCH_RESULT;


typedef struct _SEARCH_PARAM
{
	vector<char>   DeviceName;                //The id of object returned in DEVICE_NAME::ID
	UINT16         Features;
#define _SEARCH_FEATURE_IGNORE_CASE        1  //The data need to be search is string and ignore the case
#define _SEARCH_FEATURE_SPECIFIED_POSITION 2  //To search specified position in block, such as search string at header of block(user specified)
#define _SEARCH_FEATURE_SPECIFIED_SECTION  4  //To search specified section in block, such as search string from header of block(user specified)
#define _SEARCH_FEATURE_REG_FORMAT         8  //
	
	UINT64         StartOffset,LastOffset;    //Searching range, the unit of both of them is byte
	UINT32         BlockSize;                 //Only for _SEARCH_FEATURE_SPECIFIED_MEMBER, to search data in certain position of block
	UINT32         OffsetInBlock;             //Search from specified offset in block(search part of block)
	UINT16         DataSize;                  //size of data for searching
	UINT16         TaskID;                    //The searching ID, front-end should use it to query result, 0 means new task
	vector<UINT8>  Data;                      //data for searching
	PSEARCH_RESULT Result;
}SEARCH_PARAM,*PSEARCH_PARAM;


typedef struct _SEARCH_TASK
{
	SEARCH_PARAM  Parameter;
	vector<UINT8> InterBuffer;
	UINT          OffsetInBlock;
	UINT          RemainOffset,BufferSize;
	PUINT8        SearchPoint;
#ifdef _WIN32
	HANDLE        Device;
#else //_WIN32
	int           Device;
#endif //_WIN32
}SEARCH_TASK,*PSEARCH_TASK;


#define _COMMAND_CLEAR_SEARCH_RESULT   6  //Clear current search result


#define _COMMAND_CLOSE_SEARCH_TASK     7  //Stop task and release resources

#define ALIGN2DOWN(a,b)((((a))/(b))*(b))


#define _COMMAND_REPLACE_MODIFIED_FILE 8  //Set the size of file, the parameter is a UINT64 value
typedef struct _REPLACE_MODIFIED_FILE
{
	char FileName[1024];
}REPLACE_MODIFIED_FILE,*PREPLACE_MODIFIED_FILE;


#define _COMMAND_STOP_SERVER           9  //Stop all work and save status


#pragma pack(pop)
