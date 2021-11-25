#ifdef _WIN32
#include <Windows.h>
#include <WinIoCtl.h>

#define PROVIDER_DESCRIPTION (PCHAR)"weLees Windows DiskProvider"
#else //_WIN32
typedef int BOOL;
typedef char CHAR,*PCHAR;
typedef unsigned short UINT16,*PUINT16;
typedef unsigned char UINT8,*PUINT8;
typedef unsigned int UINT32,*PUINT32,UINT,*PUINT,ULONG,*PULONG;
typedef unsigned long long UINT64,*PUINT64;
typedef long long INT64,*PINT64;
typedef void *PVOID;

#define IN
#define OUT
#define APIENTRY

#ifndef _MACOS
#define PROVIDER_DESCRIPTION (PCHAR)"weLees Linux DiskProvider"
#include <linux/fs.h>
#include <linux/hdreg.h>
#else //_MACOS
#define OutputDebugString printf
#define lseek64 lseek
#define PROVIDER_DESCRIPTION (PCHAR)"weLees Apple OSX DiskProvider"
#include <sys/disk.h>
#endif //_MACOS
#include <fcntl.h>
#include <sys/ioctl.h>
#include <stdio.h>
#include <errno.h>
#include <unistd.h>
#include <string.h>
#include <pthread.h>
#include <sys/wait.h>

#endif //_WIN32

#include <stdio.h>
#include <vector>
using namespace std;
#include "../Provider/Defines.h"


#define PROVIDER_VENDOR "<a href='https://www.welees.com' target='_blank'>weLees Co., Ltd.</a>"

typedef struct _SIZE_DESC
{
	UINT64 Size;
	char   Unit[16];
}SIZE_DESC,*PSIZE_DESC;


void ShowSize(OUT PCHAR pBuffer,IN int iBufferSize,IN UINT64 uBytes,IN UINT uSectorSize)
{
	int              i;
	static SIZE_DESC sdSize[]={
		{(UINT64)1,"Bytes"},
		{(UINT64)1024,"Kilo Bytes"},
		{(UINT64)1048576,"Mega Bytes"},
		{(UINT64)1048576*1024,"Giga Bytes"},
		{(UINT64)1048576*1048576,"Tera Bytes"},
		{(UINT64)1048576*1048576*1024,"Peta Bytes"},
		{(UINT64)1048576*1048576*1045876,"Exa Bytes"}
	};
	
	for(i=sizeof(sdSize)/sizeof(SIZE_DESC)-1;i>0;i--)
	{
		if(uBytes>=sdSize[i].Size)
		{
			break;
		}
	}
	
#if _MSC_VER<1300
	sprintf(pBuffer,"%.2f %s<br>Sector Size %d Bytes",(double)((INT64)uBytes)/(double)((INT64)sdSize[i].Size),sdSize[i].Unit,uSectorSize);
#else
	sprintf_s(pBuffer,iBufferSize,"%.2f %s<br>Sector Size %d Bytes",(double)((INT64)uBytes)/(double)((INT64)sdSize[i].Size),sdSize[i].Unit,uSectorSize);
#endif
}


PUINT8 SearchByte(IN PUINT8 pBuffer,IN UINT uSize,IN UINT8 uData,OUT PUINT pSize)
{
	PUINT8 p=pBuffer;
	
	while(uSize)
	{
		if(*pBuffer==uData)
		{
			*pSize=(UINT)(pBuffer-p);
			return pBuffer;
		}
		pBuffer++;
		uSize--;
	}
	
	*pSize=(UINT)(pBuffer-p);
	return NULL;
}


int                  g_iSearchID=1;
vector<PSEARCH_TASK> g_SearchTask;
#define _MAX_MATCH_COUNT 100


#ifdef _WIN32
ULONG APIENTRY SearchRoutine(IN PSEARCH_TASK pTask)
#else //_WIN32
PVOID APIENTRY SearchRoutine(IN PVOID p)
#endif //_WIN32
{
	int           i;
	UINT          uSize;
#ifdef _WIN32
	DWORD         u;
#else //_WIN32
	UINT          u;
	PSEARCH_TASK  pTask=(PSEARCH_TASK)p;
#endif //_WIN32
	UINT64        uSearchSize;
	SEARCH_ITEM   siItem,*pItem;
	PSEARCH_PARAM pSearch=&pTask->Parameter;
	
	pTask->Parameter.Result->ErrorCode=0;
/*
	if(pTask->Parameter->Features&_SEARCH_FEATURE_IGNORE_CASE)
	{//Ignore case
		for(iRepeatSize=1;iRepeatSize<pTask->Parameter->DataSize;iRepeatSize++)
		{
			if((pTask->Parameter->Data[iRepeatSize]|0x20)==(pTask->Parameter->Data[0]|0x20))
			{
				break;
			}
		}
	}
	else
	{
		for(iRepeatSize=1;iRepeatSize<pTask->Parameter->DataSize;iRepeatSize++)
		{
			if(pTask->Parameter->Data[iRepeatSize]==pTask->Parameter->Data[0])
			{
				break;
			}
		}
	}
*/
#ifdef _WIN32
	for(i=0;i<(int)pSearch->DeviceName.size();i++)
	{
		if(pSearch->DeviceName[i]=='/')
		{
			pSearch->DeviceName[i]='\\';
		}
	}
	
	pTask->Device=CreateFile(&pSearch->DeviceName[1],GENERIC_READ,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_EXISTING,0,NULL);
	if(INVALID_HANDLE_VALUE==pTask->Device)
	{
		//pSearch->Status=_SEARCH_STATUS_STOP;
		pSearch->Result->ErrorCode=GetLastError();
		pSearch->Result->Status=_SEARCH_STATUS_STOPPED;
		return pSearch->Result->ErrorCode;
	}
#else //_WIN32
	pTask->Device=open(&pSearch->DeviceName[1],O_RDWR);
	if(pTask->Device<=0)
	{
		pSearch->Result->ErrorCode=errno;
		pSearch->Result->Status=_SEARCH_STATUS_STOPPED;
		return NULL;
	}
#endif //_WIN32
	
	pTask->Parameter.Result->MatchedCount=0;
	pTask->InterBuffer.resize(1048576);
	pTask->RemainOffset=0;
	pTask->SearchPoint=&pTask->InterBuffer[0];
	pTask->BufferSize=0;
	uSearchSize=pSearch->LastOffset-pSearch->StartOffset;
	pTask->OffsetInBlock=(UINT)(pSearch->StartOffset%(pTask->InterBuffer.size()>>1));
	pTask->Parameter.StartOffset-=pTask->OffsetInBlock;
	pTask->SearchPoint=&pTask->InterBuffer[0]+pTask->OffsetInBlock;
#ifdef _WIN32
	SetFilePointerEx(pTask->Device,*((PLARGE_INTEGER)&pSearch->StartOffset),NULL,FILE_BEGIN);
#else //_WIN32
	lseek64(pTask->Device,pSearch->StartOffset,SEEK_SET);
#endif //_WIN32
	if(pTask->Parameter.Features&_SEARCH_FEATURE_SPECIFIED_POSITION)
	{//From specified offset
		
	}
	else
	{//Normal searching
		while((uSearchSize>pSearch->DataSize)&&(!(pSearch->Result->Status&_SEARCH_STATUS_STOPPING)))
		{
			if(!pTask->BufferSize)
			{//Update buffer
#ifdef _DEBUG
				{
					char sz[256];
#ifdef _MACOS
					sprintf(sz,"Read offset %llXH.\n",pSearch->StartOffset);
#else //_MACOS
					sprintf(sz,"Read offset %I64XH.\n",pSearch->StartOffset);
#endif //MACOS
					OutputDebugString(sz);
				}
#endif //_DEBUG
#ifdef _WIN32
				if(!ReadFile(pTask->Device,&pTask->InterBuffer[0]+pTask->RemainOffset,pTask->InterBuffer.size()>>1,&u,NULL))
#else //_WIN32
				u=i=(int)read(pTask->Device,&pTask->InterBuffer[0]+pTask->RemainOffset,(int)(pTask->InterBuffer.size()>>1));
				if(i<=0)
#endif //_WIN32
				{
#ifdef _WIN32
					pTask->Parameter.Result->ErrorCode=GetLastError();
#else //_WIN32
					pTask->Parameter.Result->ErrorCode=errno;
#endif //_WIN32
					pTask->Parameter.Result->Status=_SEARCH_STATUS_STOPPED;
					//pSearch->Status=_SEARCH_STATUS_STOP;
					break;
				}
				
				pTask->BufferSize=pTask->RemainOffset+u;
				if(uSearchSize<pTask->BufferSize)
				{
					pTask->BufferSize=(UINT)uSearchSize;
				}
			}
			
			while((uSearchSize>pSearch->DataSize)&&(!(pSearch->Result->Status&_SEARCH_STATUS_STOPPING)))
			{//Search in current buffer
				if(pSearch->Result->MatchedCount>=_MAX_MATCH_COUNT)
				{
#ifdef _WIN32
					Sleep(50);
#else //_WIN32
					sleep(1);
#endif //_WIN32
					continue;
				}
				if(pSearch->Features&_SEARCH_FEATURE_IGNORE_CASE)
				{
				}
				else
				{
					pTask->SearchPoint=SearchByte(pTask->SearchPoint,pTask->BufferSize,pSearch->Data[0],&uSize);
					if(pTask->SearchPoint)
					{//Header byte matched
						pTask->BufferSize-=uSize;
						uSearchSize-=uSize;
						if(pTask->BufferSize<pSearch->DataSize)
						{//the remain data is less than search data, combine it with next blocks
							memcpy(&pTask->InterBuffer[0],pTask->SearchPoint,pTask->BufferSize);
							pTask->RemainOffset=pTask->BufferSize;
							pTask->BufferSize=0;
							//pSearch->StartOffset+=pTask->InterBuffer.size()>>1;
							break;
						}
						else
						{//Remain data can hold search data
							if(!memcmp(pTask->SearchPoint,&pSearch->Data[0],pSearch->DataSize))
							{//Found!
								//pSearch->CurrentOffset=pSearch->StartOffset+(pPos-uBuffer);
#ifdef _WIN32
								while(InterlockedExchange(&pTask->Parameter.Result->Lock,1));
#else //_WIN32
#ifdef _MACOS
								pthread_mutex_lock(&pTask->Parameter.Result->Lock);
#else //_MACOS
								pthread_spin_lock(&pTask->Parameter.Result->Lock);
#endif //_MACOS
#endif //_WIN32
								pTask->Parameter.Result->MatchedCount++;
								
								if(pTask->Parameter.Result->MatchItems.size())
								{
									pItem=&pTask->Parameter.Result->MatchItems[0];
								}
								for(i=0;i<(int)pTask->Parameter.Result->MatchItems.size();i++)
								{
									if(pItem->BlockOffset==pSearch->StartOffset+ALIGN2DOWN(pTask->SearchPoint-&pTask->InterBuffer[0]-pTask->RemainOffset,pSearch->BlockSize))
									{
										break;
									}
									pItem++;
								}
								if(i>=(int)pTask->Parameter.Result->MatchItems.size())
								{//New block
									siItem.BlockOffset=pSearch->StartOffset+ALIGN2DOWN(pTask->SearchPoint-&pTask->InterBuffer[0]-pTask->RemainOffset,pSearch->BlockSize);
									siItem.BlockData=new UINT8[pSearch->BlockSize];
									if(siItem.BlockData)
									{
										memcpy(siItem.BlockData,pTask->SearchPoint-((pTask->SearchPoint-&pTask->InterBuffer[0]-pTask->RemainOffset)%pSearch->BlockSize)+pTask->RemainOffset,pSearch->BlockSize);
										pTask->Parameter.Result->MatchItems.push_back(siItem);
										pItem=&pTask->Parameter.Result->MatchItems[pTask->Parameter.Result->MatchItems.size()-1];
									}
									else
									{
										pTask->Parameter.Result->ErrorCode=8;//ERROR_NOT_ENOUGH_MEMORY;
										break;
									}
								}
								
								pItem->CaseOffsetInBlock.push_back((pTask->SearchPoint-&pTask->InterBuffer[0]-pTask->RemainOffset)%pSearch->BlockSize);
#if defined(_DEBUG)&&defined(_WIN32)
								{
									char sz[256];
									sprintf(sz,"The matched count in block %I64XH is %d, Match offset %XH.\n",pItem->BlockOffset,pItem->CaseOffsetInBlock.size(),*(pItem->CaseOffsetInBlock.end()-1));
									OutputDebugString(sz);
								}
#endif //_DEBUG
								
#ifdef _WIN32
								InterlockedExchange(&pTask->Parameter.Result->Lock,0);
#else //_WIN32
#ifdef _MACOS
								pthread_mutex_unlock(&pTask->Parameter.Result->Lock);
#else //_WIN32
								pthread_spin_unlock(&pTask->Parameter.Result->Lock);
#endif //_MACOS
#endif //_WIN32
								pTask->SearchPoint+=pSearch->DataSize;
								pTask->BufferSize-=pSearch->DataSize;
								uSearchSize-=pSearch->DataSize;
							}
							else
							{
								pTask->SearchPoint++;
								pTask->BufferSize--;
								uSearchSize--;
							}
						}
					}
					else
					{//No match in the block
						pTask->SearchPoint=&pTask->InterBuffer[0];
						pTask->RemainOffset=0;
						pTask->OffsetInBlock=0;
						uSearchSize-=pTask->BufferSize;
						pTask->BufferSize=0;
						break;
					}
				}
			}
			
			pSearch->StartOffset+=pTask->InterBuffer.size()>>1;
			pSearch->Result->CurrentOffset=pSearch->StartOffset;
		}
	}
	
	pTask->Parameter.Result->Status|=_SEARCH_STATUS_STOPPED;
	
	return 0;
}


#ifdef _WIN32
int APIENTRY DllMain(IN HANDLE hModule,IN DWORD uCommand,LPVOID lpReserved)
{
	return TRUE;
}


extern "C" __declspec(dllexport) UINT32 ServiceEntry(IN UINT16 uCommand,IN PVOID pParameter)
{
	int                   i;
	char                  szDeviceName[MAX_PATH]="\\\\.\\physicaldrive000";
	ULONG                 u;
	union
	{
		DISK_GEOMETRY_EX Geometry;
		BYTE             Pad[4096];
	}Data;
	HANDLE                hDevice;
	UINT32                uErrorCode=ERROR_SUCCESS;
	PSHAKE_HAND           pShakeHand;
	PENUM_DEVICE          pEnum;
	PSEARCH_TASK          pTask;
	PSEARCH_PARAM         pSearch;
	PACCESS_PARAM         pAccess;
	PQUERY_DEVICE_PROFILE pProfile;
	
	switch(uCommand)
	{
		case _COMMAND_SHAKE_HAND:
			pShakeHand=(PSHAKE_HAND)pParameter;
			pShakeHand->MajorVersion=3;
			pShakeHand->MinorVersion=2;
			pShakeHand->Features=0;
			pShakeHand->Type=_PROVIDER_TYPE_SOLID_DEVICE_PROVIDER;
#if _MSC_VER<1300
			strcpy(pShakeHand->Name,"Disks");
			strcpy(pShakeHand->Description,PROVIDER_DESCRIPTION);
			strcpy(pShakeHand->Vendor,PROVIDER_VENDOR);
#else
			strcpy_s(pShakeHand->Name,sizeof(pShakeHand->Name),"Disks");
			strcpy_s(pShakeHand->Description,sizeof(pShakeHand->Description),PROVIDER_DESCRIPTION);
			strcpy_s(pShakeHand->Vendor,sizeof(pShakeHand->Vendor),PROVIDER_VENDOR);
#endif
			break;
		case _COMMAND_ENUM_DEVICE:
			pEnum=(PENUM_DEVICE)pParameter;
			pEnum->ReturnCount=0;
			for(i=0;i<pEnum->RequestCount;i++)
			{
#if _MSC_VER<1300
				sprintf(szDeviceName+17,"%d",(int)pEnum->Handle);
#else
				sprintf_s(szDeviceName+17,sizeof(szDeviceName-17),"%d",(int)pEnum->Handle);
#endif
				hDevice=CreateFile(szDeviceName,GENERIC_READ,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_EXISTING,0,NULL);
				if(INVALID_HANDLE_VALUE==hDevice)
				{
					break;
				}
#if _MSC_VER<1300
				sprintf(pEnum->Result[i].Name,"//./physicaldrive%d",(int)pEnum->Handle);
				sprintf(pEnum->Result[i].Desc,"Disk %d",(int)pEnum->Handle+1);
#else
				sprintf_s(pEnum->Result[i].Name,sizeof(pEnum->Result[i].Name),"//./physicaldrive%d",(int)pEnum->Handle);
				sprintf_s(pEnum->Result[i].Desc,sizeof(pEnum->Result[i].Desc),"Disk %d",(int)pEnum->Handle+1);
#endif
				pEnum->Result[i].Folder=FALSE;
				CloseHandle(hDevice);
				pEnum->Handle++;
			}
			pEnum->ReturnCount=i;
			break;
		case _COMMAND_GET_DEVICE_PROFILE:
			pProfile=(PQUERY_DEVICE_PROFILE)pParameter;
			pProfile->Features=0;
#if _MSC_VER<1300
			strcpy(szDeviceName,pProfile->Name);
#else
			strcpy_s(szDeviceName,sizeof(szDeviceName),pProfile->Name);
#endif
			for(i=0;i<(int)strlen(szDeviceName);i++)
			{
				if(szDeviceName[i]=='/')
				{
					szDeviceName[i]='\\';
				}
			}
			hDevice=CreateFile(szDeviceName+1,GENERIC_READ,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_EXISTING,0,NULL);
			if(INVALID_HANDLE_VALUE==hDevice)
			{
				uErrorCode=GetLastError();
			}
			else
			{
				if(DeviceIoControl(hDevice,IOCTL_DISK_GET_DRIVE_GEOMETRY_EX,
					NULL,0,Data.Pad,sizeof(Data.Pad),&u,NULL))
				{
					pProfile->BlockSize  = Data.Geometry.Geometry.BytesPerSector;
					pProfile->TotalBytes = Data.Geometry.DiskSize.QuadPart;
				}
				else
				{
					uErrorCode=GetLastError();
					break;
				}
				CloseHandle(hDevice);
				hDevice=CreateFile(szDeviceName,GENERIC_READ|GENERIC_WRITE,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_EXISTING,0,NULL);
				if(INVALID_HANDLE_VALUE==hDevice)
				{
					pProfile->Features|=_DEVICE_FEATURE_READ_ONLY;
				}
				pProfile->Features|=_DEVICE_FEATURE_BLOCK_DEVICE|_DEVICE_FEATURE_SEARCH;
				//LOG_ERR("Get profile of device %s fail, error code %XH.\r\n",m_pDeviceName,GetLastError());
#if _MSC_VER<1300
				sprintf(pProfile->InitializeParameters,"{Features:'%X',SectorSize:'%X',TotalSectors:'%I64X'}",pProfile->Features,pProfile->BlockSize,pProfile->TotalBytes/pProfile->BlockSize);
				sscanf(szDeviceName+18,"%d",&i);
				sprintf(pProfile->Description,"Disk %d<br>Device Name %s<br>Size ",++i,pProfile->Name);
#else
				sprintf_s(pProfile->InitializeParameters,sizeof(pProfile->InitializeParameters),"{Features:'%X',SectorSize:'%X',TotalSectors:'%I64X'}",pProfile->Features,pProfile->BlockSize,pProfile->TotalBytes/pProfile->BlockSize);
				sscanf_s(szDeviceName+18,"%d",&i);
				sprintf_s(pProfile->Description,sizeof(pProfile->Description),"Disk %d<br>Device Name %s<br>Size ",++i,pProfile->Name);
#endif
				ShowSize(pProfile->Description+strlen(pProfile->Description),sizeof(pProfile->Description)-strlen(pProfile->Description),pProfile->TotalBytes,pProfile->BlockSize);
				CloseHandle(hDevice);
			}
			break;
		case _COMMAND_READ:
			pAccess=(PACCESS_PARAM)pParameter;
#if _MSC_VER<1300
			strcpy(szDeviceName,pAccess->Name);
#else
			strcpy_s(szDeviceName,sizeof(szDeviceName),pAccess->Name);
#endif
			for(i=0;i<(int)strlen(szDeviceName);i++)
			{
				if(szDeviceName[i]=='/')
				{
					szDeviceName[i]='\\';
				}
			}
			hDevice=CreateFile(szDeviceName+1,GENERIC_READ,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_EXISTING,0,NULL);
			if(INVALID_HANDLE_VALUE==hDevice)
			{
				uErrorCode=GetLastError();
			}
			else
			{
				SetFilePointerEx(hDevice,*((PLARGE_INTEGER)&pAccess->ByteOffset),NULL,FILE_BEGIN);
				if(!ReadFile(hDevice,pAccess->Buffer,pAccess->Size,&u,NULL))
				{
					uErrorCode=GetLastError();
				}
				CloseHandle(hDevice);
			}
			break;
		case _COMMAND_WRITE:
			pAccess=(PACCESS_PARAM)pParameter;
#if _MSC_VER<1300
			strcpy(szDeviceName,pAccess->Name);
#else
			strcpy_s(szDeviceName,sizeof(szDeviceName),pAccess->Name);
#endif
			for(i=0;i<(int)strlen(szDeviceName);i++)
			{
				if(szDeviceName[i]=='/')
				{
					szDeviceName[i]='\\';
				}
			}
			hDevice=CreateFile(szDeviceName+1,GENERIC_WRITE,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_EXISTING,0,NULL);
			if(INVALID_HANDLE_VALUE==hDevice)
			{
				uErrorCode=GetLastError();
			}
			else
			{
				SetFilePointerEx(hDevice,*((PLARGE_INTEGER)&pAccess->ByteOffset),NULL,FILE_BEGIN);
				if(!WriteFile(hDevice,pAccess->Buffer,pAccess->Size,&u,NULL))
				{
					uErrorCode=GetLastError();
				}
				CloseHandle(hDevice);
			}
			break;
		case _COMMAND_SEARCH:
			pSearch=(PSEARCH_PARAM)pParameter;
			if(!pSearch->TaskID)
			{
				pSearch->Result=new SEARCH_RESULT;
				if(!pSearch->Result)
				{
					uErrorCode=ERROR_NOT_ENOUGH_MEMORY;
					break;
				}
				pTask=new SEARCH_TASK;
				if(!pTask)
				{
					delete pSearch->Result;
					pSearch->Result=NULL;
					uErrorCode=ERROR_NOT_ENOUGH_MEMORY;
					break;
				}
				else
				{
					pSearch->Result->TaskID=pSearch->TaskID=g_iSearchID++;
					pSearch->Result->Lock=0;
					pSearch->Result->Status=0;
					pSearch->Result->ErrorCode=0;
					pSearch->Result->CurrentOffset=pSearch->StartOffset;
					pTask->Parameter=*pSearch;
					g_SearchTask.push_back(pTask);
					
					CloseHandle(CreateThread(NULL,0,(LPTHREAD_START_ROUTINE)SearchRoutine,pTask,0,(PDWORD)&i));
				}
			}
			else
			{
				for(i=0;i<(int)g_SearchTask.size();i++)
				{
					if(pSearch->TaskID==g_SearchTask[i]->Parameter.TaskID)
					{
						pTask=g_SearchTask[i];
						break;
					}
				}
				if(i>=(int)g_SearchTask.size())
				{
					uErrorCode=ERROR_INVALID_PARAMETER;
					break;
				}
				pSearch->Result=pTask->Parameter.Result;
			}
			
			uErrorCode=pTask->Parameter.Result->ErrorCode;
			break;
		case _COMMAND_CLEAR_SEARCH_RESULT:
			for(i=0;i<(int)g_SearchTask.size();i++)
			{
				if(g_SearchTask[i]->Parameter.TaskID==*((PUINT16)pParameter))
				{
					for(u=0;u<g_SearchTask[i]->Parameter.Result->MatchItems.size();u++)
					{
						delete g_SearchTask[i]->Parameter.Result->MatchItems[u].BlockData;
						g_SearchTask[i]->Parameter.Result->MatchItems[u].CaseOffsetInBlock.clear();
					}
					g_SearchTask[i]->Parameter.Result->MatchItems.clear();
					g_SearchTask[i]->Parameter.Result->MatchedCount=0;
					break;
				}
			}
			uErrorCode=ERROR_SUCCESS;
			break;
		case _COMMAND_CLOSE_SEARCH_TASK:
			for(i=0;i<(int)g_SearchTask.size();i++)
			{
				if(g_SearchTask[i]->Parameter.TaskID==*((PUINT16)pParameter))
				{
					g_SearchTask[i]->Parameter.Result->Status|=_SEARCH_STATUS_STOPPING;
					while(!(g_SearchTask[i]->Parameter.Result->Status&_SEARCH_STATUS_STOPPED))
					{
						Sleep(100);
					}
					CloseHandle(g_SearchTask[i]->Device);
					delete g_SearchTask[i]->Parameter.Result;
					delete g_SearchTask[i];
					g_SearchTask.erase(g_SearchTask.begin()+i);
					break;
				}
			}
			uErrorCode=ERROR_SUCCESS;
			break;
		default:
			uErrorCode=ERROR_NOT_SUPPORTED;
			break;
	}
	
	return uErrorCode;
}

#else //_WIN32
int PipeRun(IN char *pFormat,IN UINT uTimeout,OUT vector<char> &sRet)
{
	int       i,iRet,iSize,iHandle,iStatus;
	char      szBuf[1024];
	FILE      *file;
	fd_set    rs;
	timeval   tmv;
	// format and write the data we were given
	
	file=popen(pFormat,"r");
	if(!file)
	{
		return -1;
	}

	iHandle=fileno(file);
	sRet.clear();
	sRet.push_back(0);
	if(!uTimeout)
	{
		uTimeout=-1;
	}

	for(i=0;(UINT)i<uTimeout;)
	{
		FD_ZERO(&rs);
		FD_SET(iHandle,&rs);
		
		tmv.tv_usec = 0;
		tmv.tv_sec  = 1;
		iRet=select(iHandle+1,&rs,NULL,NULL,&tmv);
		if(!iRet)
		{
			i++;
			continue;
		}
		else if(iRet<0)
		{
			break;
		}
		iSize=(int)read(iHandle,&szBuf,(int)(sizeof(szBuf)-1));
		if(iSize<=0)
		{
			break;
		}
		szBuf[iSize]=0;
		iRet=(int)sRet.size();
		sRet.resize(iRet+iSize);
		strncpy(&sRet[iRet-1],szBuf,iSize);
	}
	
	if(i>=(int)uTimeout)
	{
		pclose(file);
		return 0x7FFFFFFF; //timeout
	}
	
	iStatus=pclose(file);
	
	if(!WIFEXITED(iStatus))
	{
		return 0x7FFFFFFE;
	}
	else
	{
		return WEXITSTATUS(iStatus);
	}
}


vector<char*> g_Devices;


#ifdef _LINUX
#define ENUM_DISK (PCHAR) \
"cmd='fdisk -l';" \
"title=`$cmd |grep dev|head -1|awk '{print $1}'`;" \
"list=`$cmd |grep $title|grep dev|awk '{print $2}'|sed 's/://'|sed '/\\/dev\\/ram/d'|sed '/\\/dev\\/loop/d'`;" \
"result='';" \
"for dev in `ls /dev/`; do " \
"check=`echo $list|grep \"/dev/$dev\"`;" \
"[ \"$check\" != \"\" ] && " \
"[ ! -d /dev/$dev ] && " \
"result=`echo \"/dev/$dev $result\"`;" \
"done;echo $result"
#endif //_LINUX
#ifdef _MACOS
#define ENUM_DISK (PCHAR)"diskutil list|grep '/dev/'|awk '{print $1}'|sed 's@/dev/@/dev/r@'"
#endif //_MACOS


UINT EnumerateDevices(void)
{
	int          i,j;
	char         *p,*p2,*p3;
	vector<char> sRet;
	PipeRun(ENUM_DISK,1000,sRet);
	p=&sRet[0];
	for(i=0;p[i];i++)
	{
		if((p[i]=='\n')||(p[i]=='\r')||(p[i]=='\t'))
		{
			p[i]=' ';
		}
	}
	p[sRet.size()-2]=' ';
	while(p2=strchr(p,' '))
	{
		*p2=0;
		if(p[0]!='/')
		{
			break;
		}
		p3=new char[p2-p+1];
		strcpy(p3,p);
		g_Devices.push_back(p3);
		p=p2+1;
	}
	
	for(i=0;i<(int)g_Devices.size();i++)
	{//sort
		for(j=i+1;j<(int)g_Devices.size();j++)
		{
			if(strcmp(g_Devices[i],g_Devices[j])>0)
			{
				p=g_Devices[i];
				g_Devices[i]=g_Devices[j];
				g_Devices[j]=p;
			}
		}
	}
	
	return 0;
}


extern "C" UINT32 ServiceEntry(IN UINT16 uCommand,IN PVOID pParameter)
{
	int                   i,j;
	char                  szDeviceName[256];
	UINT32                uErrorCode=0;
	pthread_t             id;
	PSHAKE_HAND           pShakeHand;
	PENUM_DEVICE          pEnum;
	PSEARCH_TASK          pTask;
	PSEARCH_PARAM         pSearch;
	PACCESS_PARAM         pAccess;
#ifndef _MACOS
	struct hd_geometry    Geometry;
#endif //_MACOS
	PQUERY_DEVICE_PROFILE pProfile;
	
	switch(uCommand)
	{
		case _COMMAND_SHAKE_HAND:
			pShakeHand=(PSHAKE_HAND)pParameter;
			pShakeHand->MajorVersion=3;
			pShakeHand->MinorVersion=2;
			pShakeHand->Features=0;
			pShakeHand->Type=_PROVIDER_TYPE_SOLID_DEVICE_PROVIDER;
			strcpy(pShakeHand->Name,(PCHAR)"Disks");
			strcpy(pShakeHand->Description,PROVIDER_DESCRIPTION);
			strcpy(pShakeHand->Vendor,PROVIDER_VENDOR);
			break;
		case _COMMAND_ENUM_DEVICE:
			if(!g_Devices.size())
			{
				EnumerateDevices();
			}
			pEnum=(PENUM_DEVICE)pParameter;
			pEnum->ReturnCount=0;
			for(i=0;(i<pEnum->RequestCount)&&(i<(int)g_Devices.size());i++)
			{
				strcpy(pEnum->Result[i].Name,g_Devices[i]);
				pEnum->Result[i].Folder=0;
				sprintf(pEnum->Result[i].Desc,"Disk %d (%s)",i,g_Devices[i]);
				pEnum->Handle++;
			}
			pEnum->ReturnCount=i;
			break;
		case _COMMAND_GET_DEVICE_PROFILE:
			pProfile=(PQUERY_DEVICE_PROFILE)pParameter;
			strcpy(szDeviceName,pProfile->Name+1);
			pProfile->Features|=_DEVICE_FEATURE_BLOCK_DEVICE|_DEVICE_FEATURE_SEARCH;
			i=open(szDeviceName,O_RDWR);
			if(i<=0)
			{
				pProfile->Features|=_DEVICE_FEATURE_READ_ONLY;
			}
			else
			{
				i=open(szDeviceName,O_RDONLY);
			}
			if(i<=0)
			{
				uErrorCode=errno;
				strcpy(pProfile->InitializeParameters,"{}");
				break;
			}
			
#ifdef _MACOS
			if(-1==ioctl(i,DKIOCGETBLOCKSIZE,&pProfile->BlockSize))
			{
				pProfile->BlockSize=512;
			}
			
			if(-1==ioctl(i,DKIOCGETBLOCKCOUNT,&pProfile->TotalBytes))
			{
				pProfile->TotalBytes=0x10000;
			}
			pProfile->TotalBytes*=pProfile->BlockSize;
#else //_MACOS
			if(ioctl(i,BLKSSZGET,&pProfile->BlockSize))
			{
				if(ioctl(i,BLKPBSZGET,&pProfile->BlockSize))
				{
					pProfile->BlockSize=512;
				}
			}
			//The BLKSSZGET is used to get sector size of logical disk
			//Use BLKPBSZGET to get sector size of physical disk
			
			ioctl(i,BLKGETSIZE64,&pProfile->TotalBytes);
#endif //_MACOS
			//pProfile->Bytes*=pProfile->SectorSize;
			
			for(j=0;j<(int)g_Devices.size();j++)
			{
				if(!strcmp(g_Devices[j],szDeviceName))
				{
					break;
				}
			}
			sprintf(pProfile->Description,"Disk %d<br>Device Name %s<br>Size ",j,pProfile->Name+1);
			ShowSize(pProfile->Description+strlen(pProfile->Description),(int)(sizeof(pProfile->Description)-strlen(pProfile->Description)),pProfile->TotalBytes,pProfile->BlockSize);
			sprintf(pProfile->InitializeParameters,"{Features:'%X',SectorSize:'%X',TotalSectors:'%llX'}",pProfile->Features,pProfile->BlockSize,pProfile->TotalBytes/pProfile->BlockSize);
			close(i);
			break;
		case _COMMAND_READ:
			pAccess=(PACCESS_PARAM)pParameter;
			strcpy(szDeviceName,pAccess->Name+1);
			i=open(szDeviceName,O_RDONLY);
			if(i<=0)
			{
				uErrorCode=errno;
			}
			else
			{
				lseek64(i,pAccess->ByteOffset,SEEK_SET);
				j=(int)read(i,pAccess->Buffer,pAccess->Size);
				if(j<=0)
				{
					uErrorCode=errno;
				}
				close(i);
			}
			break;
		case _COMMAND_WRITE:
			pAccess=(PACCESS_PARAM)pParameter;
			strcpy(szDeviceName,pAccess->Name+1);
			i=open(szDeviceName,O_RDWR);
			if(i<=0)
			{
				uErrorCode=errno;
			}
			else
			{
				lseek64(i,pAccess->ByteOffset,SEEK_SET);
				j=(int)write(i,pAccess->Buffer,pAccess->Size);
				if(j<=0)
				{
					uErrorCode=errno;
				}
				close(i);
			}
			break;
		case _COMMAND_STOP_SERVER:
			uErrorCode=0;
			break;
		case _COMMAND_SEARCH:
			pSearch=(PSEARCH_PARAM)pParameter;
			if(!pSearch->TaskID)
			{
				pSearch->Result=new SEARCH_RESULT;
				if(!pSearch->Result)
				{
					uErrorCode=87;
					break;
				}
				pTask=new SEARCH_TASK;
				if(!pTask)
				{
					delete pSearch->Result;
					pSearch->Result=NULL;
					uErrorCode=87;
					break;
				}
				else
				{
					pSearch->Result->TaskID=pSearch->TaskID=g_iSearchID++;
#ifdef _MACOS
					pthread_mutex_init(&pSearch->Result->Lock,NULL);
#else //_MACOS
					pthread_spin_init(&pSearch->Result->Lock,PTHREAD_PROCESS_PRIVATE);
#endif //_MACOS
					pSearch->Result->Status=0;
					pSearch->Result->ErrorCode=0;
					pSearch->Result->CurrentOffset=pSearch->StartOffset;
					pTask->Parameter=*pSearch;
					g_SearchTask.push_back(pTask);
					
					pthread_create(&id,NULL,SearchRoutine,pTask);
				}
			}
			else
			{
				for(i=0;i<(int)g_SearchTask.size();i++)
				{
					if(pSearch->TaskID==g_SearchTask[i]->Parameter.TaskID)
					{
						pTask=g_SearchTask[i];
						break;
					}
				}
				if(i>=(int)g_SearchTask.size())
				{
					uErrorCode=87;
					break;
				}
				pSearch->Result=pTask->Parameter.Result;
			}
			
			uErrorCode=pTask->Parameter.Result->ErrorCode;
			break;
		case _COMMAND_CLEAR_SEARCH_RESULT:
			for(i=0;i<(int)g_SearchTask.size();i++)
			{
				if(g_SearchTask[i]->Parameter.TaskID==*((PUINT16)pParameter))
				{
					for(j=0;j<g_SearchTask[i]->Parameter.Result->MatchItems.size();j++)
					{
						delete g_SearchTask[i]->Parameter.Result->MatchItems[j].BlockData;
						g_SearchTask[i]->Parameter.Result->MatchItems[j].CaseOffsetInBlock.clear();
					}
					g_SearchTask[i]->Parameter.Result->MatchItems.clear();
					g_SearchTask[i]->Parameter.Result->MatchedCount=0;
					break;
				}
			}
			uErrorCode=0;
			break;
		case _COMMAND_CLOSE_SEARCH_TASK:
			for(i=0;i<(int)g_SearchTask.size();i++)
			{
				if(g_SearchTask[i]->Parameter.TaskID==*((PUINT16)pParameter))
				{
					g_SearchTask[i]->Parameter.Result->Status|=_SEARCH_STATUS_STOPPING;
					while(!(g_SearchTask[i]->Parameter.Result->Status&_SEARCH_STATUS_STOPPED))
					{
						sleep(1);
					}
					close(g_SearchTask[i]->Device);
					delete g_SearchTask[i]->Parameter.Result;
					delete g_SearchTask[i];
					g_SearchTask.erase(g_SearchTask.begin()+i);
					break;
				}
			}
			uErrorCode=0;
			break;
		case _COMMAND_REPLACE_MODIFIED_FILE:
		default:
			uErrorCode=50;//ERROR_NOT_SUPPORTED
			break;
	}
	
	if(uErrorCode==EACCES)
	{
		uErrorCode=5;
	}
	else if(uErrorCode==EBUSY)
	{
		uErrorCode=142;//ERROR_BUSY_DRIVE
	}
	return uErrorCode;
}
#endif //_WIN32
