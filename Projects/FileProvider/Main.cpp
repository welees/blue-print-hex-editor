#ifdef _WIN32
#include <Windows.h>
#include <WinIoCtl.h>
#else //_WIN32
typedef int BOOL;
typedef char CHAR,*PCHAR;
typedef unsigned short UINT16,*PUINT16;
typedef unsigned char UINT8,*PUINT8;
typedef unsigned long UINT32,*PUINT32;
typedef unsigned long long UINT64,*PUINT64;
typedef void *PVOID;

#define IN
#define OUT

#include <linux/fs.h>
#include <fcntl.h>
#include <sys/ioctl.h>
#include <stdio.h>
#include <errno.h>
#include <linux/hdreg.h>
#include <unistd.h>
#include <string.h>

#endif //_WIN32



#include <stdio.h>
#include <vector>
using namespace std;
#include "../Provider/Defines.h"


typedef struct _SIZE_DESC
{
	UINT64 Size;
	char   Unit[16];
}SIZE_DESC,*PSIZE_DESC;


void ShowSize(OUT PCHAR pBuffer,IN int iBufferSize,IN UINT64 uBytes)
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
	sprintf(pBuffer,"%.2f %s",(double)((INT64)uBytes)/(double)((INT64)sdSize[i].Size),sdSize[i].Unit);
#else
	sprintf_s(pBuffer,iBufferSize,"%.2f %s",(double)((INT64)uBytes)/(double)((INT64)sdSize[i].Size),sdSize[i].Unit);
#endif
}


PUINT8 SearchByte(IN PUINT8 pBuffer,IN UINT uSize,IN UINT8 uData,OUT PUINT pSize)
{
	PUINT8 p=pBuffer;
	
	while(uSize)
	{
		if(*pBuffer==uData)
		{
			*pSize=pBuffer-p;
			return pBuffer;
		}
		pBuffer++;
		uSize--;
	}
	
	*pSize=pBuffer-p;
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
#endif //_WIN32
#ifdef _WIN32
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
	pTask->OffsetInBlock=pSearch->StartOffset%(pTask->InterBuffer.size()>>1);
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
					sprintf(sz,"Read offset %I64XH.\n",pSearch->StartOffset);
					OutputDebugString(sz);
				}
#endif //_DEBUG
#ifdef _WIN32
				if(!ReadFile(pTask->Device,&pTask->InterBuffer[0]+pTask->RemainOffset,pTask->InterBuffer.size()>>1,&u,NULL))
#else //_WIN32
				u=i=read(pTask->Device,&pTask->InterBuffer[0]+pTask->RemainOffset,pTask->InterBuffer.size()>>1);
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
								pthread_spin_lock(&pTask->Parameter.Result->Lock);
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
#ifdef _DEBUG
								{
									char sz[256];
									sprintf(sz,"The matched count in block %I64XH is %d, Match offset %XH.\n",pItem->BlockOffset,pItem->CaseOffsetInBlock.size(),*(pItem->CaseOffsetInBlock.end()-1));
									OutputDebugString(sz);
								}
#endif //_DEBUG
								
#ifdef _WIN32
								InterlockedExchange(&pTask->Parameter.Result->Lock,0);
#else //_WIN32
								pthread_spin_unlock(&pTask->Parameter.Result->Lock);
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


void FillInfo(OUT PQUERY_DEVICE_PROFILE pProfile,IN PCHAR pFileName,IN LPWIN32_FILE_ATTRIBUTE_DATA pInfo)
{
	SYSTEMTIME    Time1,Time2;
	LARGE_INTEGER liSize={0,0};
	
	pProfile->Features=_DEVICE_FEATURE_RESIZABLE|((pInfo->dwFileAttributes&FILE_ATTRIBUTE_READONLY)?_DEVICE_FEATURE_READ_ONLY:0);
	liSize.LowPart=pInfo->nFileSizeLow;
	liSize.HighPart=pInfo->nFileSizeHigh;
	pProfile->Bytes=liSize.QuadPart;
	pProfile->SectorSize=1;
	FileTimeToSystemTime(&pInfo->ftCreationTime,&Time1);
	FileTimeToSystemTime(&pInfo->ftLastAccessTime,&Time2);
#if _MSC_VER<1300
	strcpy(pProfile->Name,pFileName);
	sprintf(pProfile->Description,"File : %s,Size ",pFileName);
	ShowSize(pProfile->Description+strlen(pProfile->Description),sizeof(pProfile->Description)-strlen(pProfile->Description),pProfile->Bytes);
	sprintf(pProfile->Description+strlen(pProfile->Description),"<br>Create Time %04d-%02d-%02d %02d:%02d:%02d<br>Access Time %04d-%02d-%02d %02d:%02d:%02d",
		Time1.wYear,Time1.wMonth,Time1.wDay,Time1.wHour,Time1.wMinute,Time1.wSecond,
		Time2.wYear,Time2.wMonth,Time2.wDay,Time2.wHour,Time2.wMinute,Time2.wSecond);
#else
	strcpy_s(pProfile->Name,sizeof(pProfile->Name),pFileName);
	sprintf_s(pProfile->Description,sizeof(pProfile->Description),"File : %s,Size ",pFileName);
	ShowSize(pProfile->Description+strlen(pProfile->Description),sizeof(pProfile->Description)-strlen(pProfile->Description),pProfile->Bytes);
	sprintf_s(pProfile->Description+strlen(pProfile->Description),sizeof(pProfile->Description)-strlen(pProfile->Description),"<br>Create Time %04d-%02d-%02d %02d:%02d:%02d<br>Access Time %04d-%02d-%02d %02d:%02d:%02d",
		Time1.wYear,Time1.wMonth,Time1.wDay,Time1.wHour,Time1.wMinute,Time1.wSecond,
		Time2.wYear,Time2.wMonth,Time2.wDay,Time2.wHour,Time2.wMinute,Time2.wSecond);
#endif
}


int UnicodeToUTF8(IN const wchar_t *pSource,IN int iSourceCount,OUT PUINT8 pTarget,IN int iTargetCount)
{
	UINT charsEaten,uUsed,uBytes;
	ULONG         uVal;
	PUINT8        p3=pTarget,p4=pTarget+iTargetCount;
	static UINT8  sFirstByteMark[7]={0x00,0x00,0xC0,0xE0,0xF0,0xF8,0xFC};
	const wchar_t *p1=pSource,*p2=p1+iSourceCount;
	
	if((!iSourceCount)||(!iTargetCount))
	{
		return 0;
	}
	
	while(p1<p2)
	{
		uVal=*p1;
		uUsed=1;
		if((uVal>=0xD800)&&(uVal<=0xDBFF))
		{
			if (p1+1 >= p2)
				break;

			// Create the composite surrogate pair
			uVal=((uVal - 0xD800) << 10)
				+ ((*(p1+1) - 0xDC00)+0x10000);

			// And indicate that we ate another one
			uUsed++;
		}
		
		// Figure out how many bytes we need
		if (uVal<0x80)
			uBytes=1;
		else if (uVal<0x800)
			uBytes=2;
		else if (uVal<0x10000)
			uBytes=3;
		else if (uVal<0x200000)
			uBytes=4;
		else if (uVal<0x4000000)
			uBytes=5;
		else if (uVal<=0x7FFFFFFF)
			uBytes=6;
		else
		{
			continue;
		}
		
		if(p3+uBytes>p4)
		{
			break;
		}
		
		// We can do it,so update the source index
		p1+=uUsed;
		
		p3+=uBytes;
		switch(uBytes)
		{
			case 6:
				*--p3=byte((uVal|0x80UL)&0xBFUL);
				uVal>>=6;
			case 5:
				*--p3=byte((uVal|0x80UL)&0xBFUL);
				uVal>>=6;
			case 4:
				*--p3=byte((uVal|0x80UL)&0xBFUL);
				uVal>>=6;
			case 3:
				*--p3=byte((uVal|0x80UL)&0xBFUL);
				uVal>>=6;
			case 2:
				*--p3=byte((uVal|0x80UL)&0xBFUL);
				uVal>>=6;
			case 1:
				*--p3=byte(uVal|sFirstByteMark[uBytes]);
		}

		// Add the encoded bytes back in again to indicate we've eaten them
		p3+=uBytes;
	}

	charsEaten=(p1-pSource);

	return (p3-pTarget);
}


int ANSIToUTF8(IN PCHAR pSource,IN int iSourceCount,OUT PUINT8 pTarget,IN int iTargetCount)
{
	int    iResult=0;
	int    iLength;
#if defined(WIN32)
	PWCHAR pUnicode=new WCHAR[1+iSourceCount];
	iResult=MultiByteToWideChar(CP_ACP,0,pSource,iSourceCount,pUnicode,iTargetCount);
#else
	iLength=mbstowcs(NULL,iSourceCount,0);
	wchar_t *pUnicode=(wchar_t*)malloc((iSourceCount+1)*sizeof(wchar_t));
	iResult=mbstowcs(pUnicode,pSource,iLength+1);
#endif
	if(iResult<=0)
	{
		delete pUnicode;
		return 0;
	}
	else
	{
		iLength=UnicodeToUTF8(pUnicode,iResult,pTarget,iTargetCount);
		delete pUnicode;
		return iLength;
	}
}


size_t UTF8ToUnicode(IN PUINT8 pSource,IN int iSourceCount,OUT wchar_t *pTarget,IN int iTargetCount)
{
	//UINT         bytesEaten;
	UINT         trailingBytes,uVal,i;
	PUINT8       p1=pSource,p2=p1+iSourceCount;
	wchar_t      *p3=pTarget;
	wchar_t      *p4=p3+iTargetCount;
	static UINT8 gUTFByteIndicatorTest[6]={0x80,0xE0,0xF0,0xF8,0xFC,0xFE};
	static UINT8 gUTFByteIndicator[6]={0x00,0xC0,0xE0,0xF0,0xF8,0xFC};
	static UINT8 gUTFBytes[256]=
	{
		0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
		0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
		1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
		1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
		2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,
		3,3,3,3,3,3,3,3,4,4,4,4,5,5,5,5
	};
	static ULONG suUTFOffsets[6]={0,0x3080,0xE2080,0x3C82080,0xFA082080,0x82082080};
	// Watch for pathological scenario. Shouldn't happen,but...
	if((!iSourceCount)||(!iTargetCount))
	{
		return 0;
	}

	while((p1<p2)&&(p3<p4))
	{
		// Special-case ASCII,which is a leading byte value of<=127
		if(*p1<=127)
		{
			*p3++=wchar_t(*p1++);
			//*sizePtr++=1;
			continue;
		}

		// See how many trailing src bytes this sequence is going to require
		trailingBytes=gUTFBytes[*p1];

		//
		//  If there are not enough source bytes to do this one,then we
		//  are done. Note that we done >= here because we are implicitly
		//  counting the 1 byte we get no matter what.
		//
		//  If we break out here,then there is nothing to undo since we
		//  haven't updated any pointers yet.
		//
		if(p1+trailingBytes>=p2)
		{
			break;
		}
		
		if((gUTFByteIndicatorTest[trailingBytes]&*p1)!=gUTFByteIndicator[trailingBytes])
		{
			return 0;
		}

		uVal=*p1++;
		uVal<<=6;
		for(i=1;i<trailingBytes;i++) 
		{
			if((*p1&0xC0)==0x80) 
			{
				uVal += *p1++; 
				uVal<<=6;
			}
			else
			{
				return 0;
			}
		}
		if((*p1&0xC0)==0x80)
		{
			uVal+=*p1++;
		}
		else
		{
			return 0;
		}


		// since trailingBytes comes from an array,this logic is redundant
		//  default :
		//      ThrowXML(TranscodingException,XMLExcepts::Trans_BadSrcSeq);
		//}
		uVal-=suUTFOffsets[trailingBytes];

		//
		//  If it will fit into a single char,then put it in. Otherwise
		//  encode it as a surrogate pair. If its not valid,use the
		//  replacement char.
		//
		if (!(uVal&0xFFFF0000))
		{
			//*sizePtr++=trailingBytes+1;
			*p3++=wchar_t(uVal);
		}
		else if(uVal>0x10FFFF)
		{
			//
			//  If we've gotten more than 32 chars so far,then just break
			//  out for now and lets process those. When we come back in
			//  here again,we'll get no chars and throw an exception. This
			//  way,the error will have a line and col number closer to
			//  the real problem area.
			//
			if((p3-pTarget)>32)
			{
				break;
			}

			return 0;
		}
		else
		{
			//
			//  If we have enough room to store the leading and trailing
			//  chars,then lets do it. Else,pretend this one never
			//  happened,and leave it for the next time. Since we don't
			//  update the bytes read until the bottom of the loop,by
			//  breaking out here its like it never happened.
			//
			if(p3+1>=p4)
			{
				break;
			}

			// Store the leading surrogate char
			uVal-=0x10000;
			//*sizePtr++=trailingBytes+1;
			*p3++=wchar_t((uVal>>10)+0xD800);

			//
			//  And then the treailing char. This one accounts for no
			//  bytes eaten from the source,so set the char size for this
			//  one to be zero.
			//
			//*sizePtr++=0;
			*p3++=wchar_t(uVal&0x3FF)+0xDC00;
		}
	}

	// Update the bytes eaten
	//bytesEaten=p1-(unsigned char*)pSource;

	// Return the characters read
	return p3-pTarget;
}


int UTF8ToANSI(IN PUINT8 pSource,IN int iSourceCount,OUT PCHAR pTarget,IN int iTargetCount)
{
	int     iResult=0;
	int     iLength;
	wchar_t *pUnicode=new wchar_t[iTargetCount+1];
	
	iLength=UTF8ToUnicode(pSource,iSourceCount,pUnicode,iTargetCount);
	if(iLength == 0)
	{
		free(pUnicode);
		return 0;
	}
	pUnicode[iLength]=0;
#ifdef _WIN32
	iResult=WideCharToMultiByte(CP_ACP,0,pUnicode,(int)iLength,pTarget,(int)iLength*2,NULL,NULL);
#else
	iResult=wcstombs(pTarget,pUnicode,iLength*2);
#endif 
	delete pUnicode;
	if(iResult<=0)
	{
		return 0;
	}
	else
	{
		return iResult;
	}
}


void FillEnum(IN OUT PENUM_DEVICE pEnum,IN PWIN32_FIND_DATA pInfo)
{
	int    i;
	PUINT8 p;
	if(strcmp(pInfo->cFileName,".")&&strcmp(pInfo->cFileName,".."))
	{
		p=new UINT8[(strlen(pInfo->cFileName)+1)<<4];
		i=ANSIToUTF8(pInfo->cFileName,strlen(pInfo->cFileName),p,(strlen(pInfo->cFileName)+1)<<4);
		
		pEnum->Result[pEnum->ReturnCount].Folder=(pInfo->dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY)!=0;
#if _MSC_VER<1300
		strncpy(pEnum->Result[pEnum->ReturnCount].Name,(PCHAR)p,i);
		pEnum->Result[pEnum->ReturnCount].Name[i]=0;
		strncpy(pEnum->Result[pEnum->ReturnCount].Desc,(PCHAR)p,i);
		pEnum->Result[pEnum->ReturnCount].Desc[i]=0;
#else
		strncpy_s(pEnum->Result[pEnum->ReturnCount].Name,sizeof(pEnum->Result->Name),pInfo->cFileName,i);
		pEnum->Result[pEnum->ReturnCount].Name[i]=0;
		strncpy_s(pEnum->Result[pEnum->ReturnCount].Desc,sizeof(pEnum->Result->Desc),pInfo->cFileName,i);
		pEnum->Result[pEnum->ReturnCount].Desc[i]=0;
#endif
		delete p;
		pEnum->ReturnCount++;
	}
}


extern "C" __declspec(dllexport) UINT32 ServiceEntry(IN UINT16 uCommand,IN PVOID pParameter)
{
	int                       i;
	char                      szDeviceName[MAX_PATH]="\\\\.\\a:",szCmd[1024];
	PCHAR                     p1,p2;
	ULONG                     u;
	HANDLE                    hDevice;
	UINT32                    uErrorCode=ERROR_SUCCESS;
	PSHAKE_HAND               pShakeHand;
	PENUM_DEVICE              pEnum;
	PSEARCH_TASK              pTask;
	PSEARCH_PARAM             pSearch;
	PACCESS_PARAM             pAccess;
	WIN32_FIND_DATA           FindFile;
	PQUERY_DEVICE_PROFILE     pProfile;
	PREPLACE_MODIFIED_FILE    pReplace;
	WIN32_FILE_ATTRIBUTE_DATA Info;
	
	switch(uCommand)
	{
		case _COMMAND_SHAKE_HAND:
			pShakeHand=(PSHAKE_HAND)pParameter;
			pShakeHand->MajorVersion=3;
			pShakeHand->MinorVersion=2;
			pShakeHand->Features=_PROXY_FEATURE_WRITE|_PROXY_FEATURE_SEARCH;
			pShakeHand->Type=_PROXY_TYPE_SOLID_DEVICE_PROVIDER;
#if _MSC_VER<1300
			strcpy(pShakeHand->Name,"Files");
			strcpy(pShakeHand->Description,"weLees Windows FileProvider");
			strcpy(pShakeHand->Vendor,"<a href='https://www.welees.com' target='_blank'>weLees Co., Ltd.</a>");
#else
			strcpy_s(pShakeHand->Name,sizeof(pShakeHand->Name),"Files");
			strcpy_s(pShakeHand->Description,sizeof(pShakeHand->Description),"Windows FileProvider");
			strcpy_s(pShakeHand->Vendor,sizeof(pShakeHand->Vendor),"<a href='https://www.welees.com' target='_blank'>weLees Co., Ltd.</a>");
#endif
			break;
		case _COMMAND_ENUM_DEVICE:
			pEnum=(PENUM_DEVICE)pParameter;
			pEnum->ReturnCount=0;
			p1=pEnum->Path+1;
			p2=strchr(p1,'/');
			if(!p2)
			{//Volume
				u=GetLogicalDrives();
				for(i=(int)pEnum->Handle;(i<27)&&(pEnum->ReturnCount<pEnum->RequestCount);i++)
				{
					if(u&(1<<i))
					{
						szDeviceName[4]=i+'a';
						hDevice=CreateFile(szDeviceName,GENERIC_READ,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_EXISTING,0,NULL);
						if(INVALID_HANDLE_VALUE==hDevice)
						{
							continue;
						}
#if _MSC_VER<1300
						sprintf(pEnum->Result[pEnum->ReturnCount].Name,"//./%c:",i+'A');
						sprintf(pEnum->Result[pEnum->ReturnCount].Desc,"Volume %c:/",i+'A');
#else
						sprintf_s(pEnum->Result[pEnum->ReturnCount].Name,sizeof(pEnum->Result[pEnum->ReturnCount].Name),"//./%c:",i+'A');
						sprintf_s(pEnum->Result[pEnum->ReturnCount].Desc,sizeof(pEnum->Result[pEnum->ReturnCount].Desc),"Volume %c:/",i+'A');
#endif
						pEnum->Result[pEnum->ReturnCount].Folder=TRUE;
						CloseHandle(hDevice);
						pEnum->ReturnCount++;
					}
				}
				pEnum->Handle=i;
			}
			else
			{
				if(!pEnum->Handle)
				{
					ZeroMemory(szDeviceName,sizeof(szDeviceName));
					UTF8ToANSI((PUINT8)pEnum->Path+5,strlen(pEnum->Path+5),szDeviceName,sizeof(szDeviceName));
#if _MSC_VER<1300
					strcat(szDeviceName,"*");
#else
					strcat_s(szDeviceName,sizeof(szDeviceName),"*");
#endif
					for(i=0;i<(int)strlen(szDeviceName);i++)
					{
						if(szDeviceName[i]=='/')
						{
							szDeviceName[i]='\\';
						}
					}
					hDevice=FindFirstFile(szDeviceName,&FindFile);
					if(hDevice==INVALID_HANDLE_VALUE)
					{
						uErrorCode=GetLastError();
					}
					else
					{
						//FillInfo(pEnum->Result,szDeviceName,&FindFile);
						FillEnum(pEnum,&FindFile);
					}
					pEnum->Handle=(UINT64)hDevice;
				}
				
				hDevice=(HANDLE)pEnum->Handle;
				while(pEnum->ReturnCount<pEnum->RequestCount)
				{
					if(!FindNextFile(hDevice,&FindFile))
					{
						uErrorCode=GetLastError();
						if(ERROR_NO_MORE_FILES==uErrorCode)
						{
							uErrorCode=0;
							FindClose(hDevice);
							hDevice=NULL;
						}
						
						break;
					}
					
					//FillInfo(pEnum->Result+pEnum->ReturnCount,szDeviceName,&FindFile);
					FillEnum(pEnum,&FindFile);
				}
				pEnum->Handle=(UINT64)hDevice;
			}
			break;
		case _COMMAND_GET_DEVICE_PROFILE:
			pProfile=(PQUERY_DEVICE_PROFILE)pParameter;
			pProfile->Features=0;
			UTF8ToANSI((PUINT8)pProfile->Name+5,strlen(pProfile->Name+5),szDeviceName,sizeof(szDeviceName));
			for(i=0;i<(int)strlen(szDeviceName);i++)
			{
				if(szDeviceName[i]=='/')
				{
					szDeviceName[i]='\\';
				}
			}
			GetFileAttributesEx(szDeviceName,GetFileExInfoStandard,&Info);
			p1=strrchr(szDeviceName,'\\');
			FillInfo(pProfile,p1+1,&Info);
			break;
		case _COMMAND_READ:
			pAccess=(PACCESS_PARAM)pParameter;
			UTF8ToANSI((PUINT8)pAccess->Name+5,strlen(pAccess->Name+5),szDeviceName,sizeof(szDeviceName));
			for(i=0;i<(int)strlen(szDeviceName);i++)
			{
				if(szDeviceName[i]=='/')
				{
					szDeviceName[i]='\\';
				}
			}
			
			hDevice=CreateFile(szDeviceName,GENERIC_READ,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_EXISTING,0,NULL);
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
			}
			CloseHandle(hDevice);
			break;
		case _COMMAND_REPLACE_MODIFIED_FILE:
			pReplace=(PREPLACE_MODIFIED_FILE)pParameter;
			UTF8ToANSI((PUINT8)pReplace->FileName+5,strlen(pReplace->FileName+5),szDeviceName,sizeof(szDeviceName));
			for(i=0;i<(int)strlen(szDeviceName);i++)
			{
				if(szDeviceName[i]=='/')
				{
					szDeviceName[i]='\\';
				}
			}
#if _MSC_VER<1300
			sprintf(szCmd,"copy /y \"%s\" \"%s.bak\" >null",szDeviceName,szDeviceName);
			system(szCmd);
			sprintf(szCmd,"copy /y \"%s.swap\" \"%s\" >null",szDeviceName,szDeviceName);
			system(szCmd);
			sprintf(szCmd,"del \"%s.swap\" >null",szDeviceName,szDeviceName);
			system(szCmd);
#else
			sprintf_s(szCmd,sizeof(szCmd),"copy /y \"%s\" \"%s.bak\" >null",szDeviceName,szDeviceName);
			system(szCmd);
			sprintf_s(szCmd,sizeof(szCmd),"copy /y \"%s.swap\" \"%s\" >null",szDeviceName,szDeviceName);
			system(szCmd);
			sprintf_s(szCmd,sizeof(szCmd),"del \"%s.swap\" >null",szDeviceName,szDeviceName);
			system(szCmd);
#endif
			break;
		case _COMMAND_WRITE:
			pAccess=(PACCESS_PARAM)pParameter;
			UTF8ToANSI((PUINT8)pAccess->Name+5,strlen(pAccess->Name+5),szDeviceName,sizeof(szDeviceName));
			for(i=0;i<(int)strlen(szDeviceName);i++)
			{
				if(szDeviceName[i]=='/')
				{
					szDeviceName[i]='\\';
				}
			}
			hDevice=CreateFile(szDeviceName,GENERIC_WRITE,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_ALWAYS,0,NULL);
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
			}
			CloseHandle(hDevice);
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
		case _COMMAND_STOP_SERVER:
			uErrorCode=ERROR_SUCCESS;
			break;
		default:
			uErrorCode=ERROR_NOT_SUPPORTED;
			break;
	}
	
	return uErrorCode;
}
#else //_WIN32
#endif //_WIN32
