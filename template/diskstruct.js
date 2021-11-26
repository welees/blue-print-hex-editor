RegisterStructures(); //To register parser when script was loaded

function RegisterStructures()
{
	var mbr=
	//A structure parser, it is the MBR/PBR sector
	{
		Vendor:"weLees Co., LTD",
		//vendor information
		Ver:"2.1.0",
		Comment:"MBR(Master Boot Record)/PBR(Partition Boot Record), to detect the disk & partition information",
		Author:"Ares Lee from welees.com",
		Group:"Disk",
		//Group of structure
		Type:"mbr",
		//The type of structure, just like int/guid. other structures refer current structure by the type
		Name:"MBR/PBR",
		//The name shown on structure bar
		Size:["SectorSize",512], 
		//The size of structure.
		//  The 1st element is size for dynamical structure, it must be name of member of Parameters from device/previous structure parser, if structure is fixed size, it should be ""
		//  The 2nd element is the default size of fixed size of structure
		Parameters:
		//Default parameters, it is used for parsing structure by user instructed, for refering parsing, the previous parser should provide parameters. User can specifies in structure default parameter configuration dialog.
		{
			ExtendedPartSector:"0",
			//The sector offset of extended partition, it is used for PBR parsing, for MBR is should be 0
			HoldSector:'0',
			//The sector in which the current structure resides, if the sector user parsed is not first sector, user should specify it in structure default parameter configuration dialog.
			SectorSize:"200",
			//The bytes per sector, default value is 512
			TotalSectors:"800",
			//The total sectors of device
			
			//CAUTION : ALL NUMBER SHOULD BE HEXADECIMAL STRING
		},
		Members:
		//Members of structure
		[
			{
				Name:"code",
				//The member name, the template maybe access member with this name
				Desc:"Boot Code",
				//Showing name in structure bar
				Type:["bytearray","",0x1b8],
				//The type and size of member, it is an array with 3 members:
				//  The 1st element declare its type, it should be a default type or a registered structure
				//  The 2nd element is size of dynamical member/structure size for dynamical structure, it must be name of member of Parameters from device/previous structure parser, if structure is fixed size, it should be ""
				//  The 3rd element is size of fixed member.
			},
			{
				Name:"signature",
				Desc:"Disk Signature",
				Type:["uhex","",4]
			},
			{
				Name:"pad",
				Desc:"Pad",
				Type:["uhex","",2]
			},
			{
				Name:"mbrpart",
				Desc:"Part Entry",
				Type:["PartTable_mbrpart","",16],
				//The type of current member is a registered structure, its name combined by groupname + "_" + typename
				Repeat:4
				//The repeat means current member is an array
			},
			{
				Name:"check",
				Desc:"Validate Mark",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				//Value function means showing member with certain specification, it returns array with 2 member, 1st is the string to show,
				// 2nd is the simple check of member, -1 means bad value, 0 means no check, 1 menas correct value
				{
					return [This.Val.check,parseInt(This.Val.check,16)==0xaa55?1:-1];
				}
			},
		]
	};
	
	var mbrpart=
	{
		Vendor:"weLees Co., LTD",
		Ver:"2.0.0",
		Comment:"MBR Partition Entry, to indicate the partition information",
		Author:"Ares Lee from welees.com",
		Group:"PartTable",
		Type:"mbrpart",
		Name:"Part Entry",
		Size:["",16],
		Parameters:{ExtendedPartSector:"0",HoldSector:'0',SectorSize:"200",TotalSectors:"800"},
		Members:
		[
			{
				Name:"indicator",
				Desc:"Boot Indicator",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					if(This.Val.indicator=="80")
					{
						return ["Bootable",1];
					}
					else if(This.Val.indicator==0)
					{
						return ["Un-bootable",1];
					}
					else
					{
						return ["Bad indicator",-1];
					}
				}
			},
			{
				Name:"startheader",
				Desc:"Start CHS Header",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					return [""+parseInt(This.Val.startheader,16),0];
				}
			},
			{
				Name:"startsector",
				Desc:"Start CHS Sector",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					return [""+parseInt(This.Val.startsector,16)%64,0];
				}
			},
			{
				Name:"startcylinder",
				Desc:"Start CHS Cylinder",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					return [""+(((parseInt(This.Val.startsector,16)>>6)<<8)+parseInt(This.Val.startcylinder,16)),0];
				}
			},
			{
				Name:"fs",
				Desc:"FileSystem Type",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					var Result=["Unknown("+This.Val.fs+"H)",0];
					switch(parseInt(This.Val.fs,16))
					{
						case 0:
							Result[0]="Unused";
							break;
						case 1:
						case 4:
							Result[0]="FAT";
							break;
						case 2:
							Result[0]="Xenix 1";
							break;
						case 3:
							Result[0]="Xenix 2";
							break;
						case 5:
						case 15:
							Result[0]="Extended Partition";
							break;
						case 6:
							Result[0]="DOS Huge";
							break;
						case 7:
							Result[0]="NTFS/IFS";
							break;
						case 11:
						case 12:
							Result[0]="FAT";
							break;
						case 0x1b:
						case 0x1c:
							Result[0]="Hidden FAT32";
							break;
						case 0x42:
							Result[0]="Dyanmic Disk";
							break;
						case 0x82:
							Result[0]="Linux Swap Partition";
							break;
						case 0x83:
							Result[0]="Linux Partition";
							break;
						case 0xee:
							Result[0]="GPT Holder";
							break;
					}
					
					return Result;
				}
			},
			{
				Name:"endheader",
				Desc:"End CHS Header",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					return [""+parseInt(This.Val.endheader,16),0];
				}
			},
			{
				Name:"endsector",
				Desc:"End CHS Sector",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					return [""+parseInt(This.Val.endsector,16)%64,0];
				}
			},
			{
				Name:"endcylinder",
				Desc:"End CHS Cylinder",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					return [""+(((parseInt(This.Val.endsector,16)>>6)<<8)+parseInt(This.Val.endcylinder,16)),0];
				}
			},
			{
				Name:"lbastartsector",
				Desc:"LBA Start Sector",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					if((This.Val.fs=='05')||(This.Val.fs=='0F'))
					{
						return ["@"+getSize(parseInt(MegaHexMulU(Parameters.SectorSize,MegaHexAddU(Parameters.ExtendedPartSector,This.Val.lbastartsector)),16))+"("+This.Val.lbastartsector+")",NumberCompare(This.Val.lbastartsector,Parameters.TotalSectors)?1:-1];
					}
					else
					{
						return ["+"+getSize(parseInt(MegaHexMulU(Parameters.SectorSize,This.Val.lbastartsector),16))+"("+This.Val.lbastartsector+")",NumberCompare(This.Val.lbastartsector,Parameters.TotalSectors)?1:-1];
					}
				},
				Ref:function(Parameters,This,Base)
				{
					var Result={Ref:{},StartOffset:"",Size:""};
					This.Parameters.ExtendedPartSector='0';
					This.Parameters.SectorCount='800';
					if((!parseInt(This.Val.lbastartsector,16))||(!parseInt(This.Val.sectorcount,16)))
					{
						Result.NoRef=true;
					}
					else
					{
						if(Parameters.HoldSector==undefined)
						{
							Parameters.HoldSector="0";
						}
						if(Parameters.ExtendedPartSector==undefined)
						{
							Parameters.ExtendedPartSector="0";
						}
						This.Parameters.SectorCount=This.Val.sectorcount;
						//This.Size=MegaHexMulU(This.Val.sectorcount,Parameters.SectorSize);
						if((This.Val.fs=="05")||(This.Val.fs=="0F"))
						{//Extended partition
							Result.Ref={Group:"Disk",Type:["mbr"]};
							Result.StartOffset=MegaHexMulU(MegaHexAddU(Parameters.ExtendedPartSector,This.Val.lbastartsector),Parameters.SectorSize);
							This.Parameters.HoldSector=MegaHexAddU(This.Val.lbastartsector,Parameters.ExtendedPartSector);
							if(Parameters.ExtendedPartSector=='0')
							{
								This.Parameters.ExtendedPartSector=This.Val.lbastartsector;
								This.Parameters.SectorCount=This.Val.sectorcount;
							}
							else
							{
								//This.Parameters.ExtendedPartSector=Parameters.ExtendedPartSector;
								//This.Parameters.SectorCount=Parameters.SectorCount;
							}
						}
						else if(This.Val.fs=="EE")
						{//GPT holder
							This.Parameters.HoldSector=This.Val.lbastartsector;
							This.Parameters.StartSector=This.Val.lbastartsector;
							//This.Parameters.SectorCount=Parameters.SectorCount;
							Result.StartOffset=MegaHexMulU(MegaHexAddU(Parameters.HoldSector,This.Val.lbastartsector),Parameters.SectorSize);
							Result.Ref=
							{
								Group:"Disk",Type:["gptheader"],
								/*Target:
								{
									Name:"",
									Sections:
									[
										[Parameters.DeviceName,0,MegaHexMulU(This.Val.lbastartsector,Parameters.SectorSize),MegaHexMulU(This.Val.sectorcount,Parameters.SectorSize)]
									]
								}*/
							};
						}
						else
						{//Normale partition
							This.Parameters.HoldSector=MegaHexAddU(This.Val.lbastartsector,Parameters.HoldSector);
							This.Parameters.StartSector=MegaHexAddU(Parameters.HoldSector,This.Val.lbastartsector);
							Result.StartOffset=MegaHexMulU(MegaHexAddU(Parameters.HoldSector,This.Val.lbastartsector),Parameters.SectorSize);
							Result.Ref.Target={Name:"",Sections:[[Parameters.DeviceName,0,MegaHexMulU(MegaHexAddU(Parameters.HoldSector,This.Val.lbastartsector),Parameters.SectorSize),MegaHexMulU(This.Val.sectorcount,Parameters.SectorSize)]]};
							Result.Ref.Target.Name=Parameters.DeviceName+"_pt_"+Result.Ref.Target.Sections[0][2];
							if(This.Val.fs=="07")
							{
								Result.Ref.Group="FileSystem";
								Result.Ref.Type=["ntfs","ifs"];
							}
							else if((This.Val.fs=="01")||(This.Val.fs=="0B")||(This.Val.fs=="0C")||(This.Val.fs=="1B")||(This.Val.fs=="1C"))
							{
								Result.Ref.Group="FileSystem";
								Result.Ref.Type=["fat12","fat16","fat32"];
							}
							else if((This.Val.fs=='42'))
							{
								Result.Ref.Group="Disk";
								Result.Ref.Type=["ldmmeta"];
							}
							else if((This.Val.fs=='82'))
							{
								Result.Ref.Group="FileSystem";
								Result.Ref.Type=["ext_2_3_4","jfs"];
							}
							else
							{
								Result.Ref.Group="FileSystem";
								Result.Ref.Type=[];
							}
						}
					}
					
					return Result;
				}
			},
			{
				Name:"sectorcount",
				Desc:"Sector Count",
				Type:["uhex","",4], //uhex/hex/oct/uoct/udec/dec/bin, bytes
				Value:function(Parameters,This,Base)
				{
					var r=[getSize(parseInt(Parameters.SectorSize,16)*parseInt(This.Val.sectorcount,16))+"("+This.Val.sectorcount+"H)",0];
					
					if(((This.Val.fs!='00')&&(!parseInt(This.Val.sectorcount,16)))||
					   ((This.Val.fs=='00')&&(parseInt(This.Val.sectorcount,16))))
					{
						r[1]=-1;
					}
					return r;
				}
			}
		]
	};
	
	var gptheader={ //(1)Structure parser
		Vendor:"weLees Co., LTD", //Information
		Ver:"2.0.0",
		Comment:"GPT(Global Partition Table) Header, to detect the disk & partition information",
		Author:"Ares Lee from welees.com",
		Group:"Disk", //(1) Group name
		Type:"gptheader", //(2) Structure name
		Name:"GPT Header", //(3) Showing name
		Size:["SectorSize",512], //(4) Structure size
		Parameters:{AlternateHeaderSector:'0',SectorSize:"200",TotalSectors:"800"}, //(5) Default parameters
		Members: //(6) Members in structure
		[
			{
				Name:"signature", //(7) Member name
				Desc:"Signature", //(8) Showing name
				Type:['bytearray',"",8], //(9) Member size
				Value:function(Parameters,This,Base)//(10) Value filter for member
				{
					if(This.Val.signature=='45 46 49 20 50 41 52 54 ') //(11) Using structuer member
					{
						return ['EFI PART',1]; //(12) Return of Value filter
					}
					else
					{
						return [This.Val.signature,-1]; //(12) Return of Value filter
					}
				}
			},
			{
				Name:"rev",
				Desc:"Revision",
				Type:['uhex',"",4],
			},
			{
				Name:"headersize",
				Desc:"Size of Header",
				Type:['uhex',"",4],
				Value:function(Parameters,This,Base)
				{
					return [This.Val.headersize,parseInt(This.Val.headersize,16)<=parseInt(Parameters.SectorSize,16)?1:-1];
				}
			},
			{
				Name:"headercrc",
				Desc:"CRC of GPT Header",
				Type:['uhex',"",4],
				Value:function(Parameters,This,Base)
				{
					var a=This.Val.signature.replace(/\s*/g,"");
					return [This.Val.headercrc,0];
				}
			},
			{
				Name:"pad",
				Desc:"Pad",
				Type:['uhex',"",4],
			},
			{
				Name:"primaryheaderoffset",
				Desc:"Primary Header Sector",
				Type:['uhex',"",8],
				Value:function(Parameters,This,Base)
				{
					return [This.Val.primaryheaderoffset,
							(!MegaHexCompU(MegaHexDivU(Base,Parameters.SectorSize),This.Val.primaryheaderoffset))&&
							(((Parameters.AlternateHeaderSector!='0')&&(!MegaHexCompU(Parameters.AlternateHeaderSector,This.Val.primaryheaderoffset)))||
							 (Parameters.AlternateHeaderSector=='0'))
							?1:-1];
				}
			},
			{
				Name:"coheaderoffset",
				Desc:"Alternate Header Sector",
				Type:['uhex',"",8],
				Value:function(Parameters,This,Base)
				{
					return [This.Val.coheaderoffset,
							(((Parameters.PrimaryHeaderOffset!=undefined)&&(!MegaHexCompU(Parameters.PrimaryHeaderOffset,This.Val.coheaderoffset)))||
							 (Parameters.PrimaryHeaderOffset==undefined))
							?1:-1];
				},
				Ref:function(Parameters,This,Base) //(13) Associated structure refering filter
				{
					var Result={Ref:{Group:"Disk",Type:["gptheader"]},StartOffset:MegaHexMulU(This.Val.coheaderoffset,Parameters.SectorSize),Size:Parameters.Size};
					This.Parameters.PrimaryHeaderOffset=This.Val.primaryheaderoffset;
					This.Parameters.AlternateHeaderSector=This.Val.coheaderoffset;
					
					return Result;
				}
			},
			{
				Name:"firstsector",
				Desc:"First Data Sector",
				Type:['uhex',"",8],
			},
			{
				Name:"lastsector",
				Desc:"Last Data Sector",
				Type:['uhex',"",8],
			},
			{
				Name:"diskid",
				Desc:"Disk ID",
				Type:['guid',"",16],
			},
			{
				Name:"parttablestartsector",
				Desc:"Part Table Start Sector",
				Type:['uhex',"",8],
				Value:function(Parameters,This,Base)
				{
					var s=MegaHexMulU(This.Val.partentrysize,This.Val.parttableentrycount);
					return [This.Val.parttablestartsector,
							((MegaHexModU(s,Parameters.SectorSize)=='0')&&
							 ((MegaHexCompU(MegaHexAddU(This.Val.parttablestartsector,MegaHexDivU(s,Parameters.SectorSize)),This.Val.firstsector)<=0)||
							  (MegaHexCompU(This.Val.parttablestartsector,This.Val.lastsector)>0)))
							?1:-1];
				},
				Ref:function(Parameters,This,Base)
				{
					var Result={Ref:{Group:"PartTable",Type:["gptentry"],Size:This.Val.parttableentrysize,Repeat:This.Val.parttableentrycount},StartOffset:MegaHexMulU(Parameters.SectorSize,This.Val.parttablestartsector),Size:MegaHexMulU(This.Val.partentrysize,This.Val.parttableentrycount)};
					This.Parameters.EntryCount=This.Val.parttableentrycount;
					This.Parameters.EntrySize=This.Val.partentrysize;
					This.Parameters.FirstSector=This.Val.firstsector;
					This.Parameters.LastSector=This.Val.lastsector;
					This.Parameters.CRC=This.Val.entrycrc;
					
					return Result;
				}
			},
			{
				Name:"parttableentrycount",
				Desc:"Count of Part Entry",
				Type:['uhex',"",4],
				Value:function(Parameters,This,Base)
				{
					return [parseInt(This.Val.parttableentrycount,16),0];
				},
			},
			{
				Name:"partentrysize",
				Desc:"Bytes per Part Entry",
				Type:['uhex',"",4],
			},
			{
				Name:"entrycrc",
				Desc:"CRC of Part Table",
				Type:['uhex',"",4],
			}
		]
	};

	var gptentry={
		Vendor:"weLees Co., LTD",
		Ver:"2.0.0",
		Comment:"GPT(Global Partition Table) Partition Entry",
		Author:"Ares Lee from welees.com",
		Group:"PartTable",
		Type:"gptentry",
		Name:"GPT Entry",
		Size:["EntrySize",128],
		Parameters:{CRC:'0',FirstSector:'22',LastSector:'0',EntryCount:"80",EntrySize:"80",SectorSize:"200"},
		Members:
		[
			{
				Name:"type",
				Desc:"Partition Type",
				Type:['guid',"",16],
				Value:function(Parameters,This,Base)
				{
					var Type=
					[
						["{00000000-0000-0000-0000000000000000}","Unused Entry"],
						["{C12A7328-F81F-11D2-BA4B00A0C93EC93B}","EFI System Partition"],
						["{E3C9E316-0B5C-4DB8-817DF92DF00215AE}","Microsoft Reserved"],
						["{EBD0A0A2-B9E5-4433-87C068B6B72699C7}","Normal Partition"],
						["{0FC63DAF-8483-4772-8E793D69D8477DE4}","Linux Partition"],
						["{024DEE41-33E7-11D3-9D690008C781F39F}","MBR Table"],
						["{21686148-6449-6E6F-744E656564454649}","BIOS Boot Partition"],
						["{5808C8AA-7E8F-42E0-85D2E1E90434CFB3}","Dynamic Meta Partition"],
						["{AF9B60A0-1431-4F62-BC683311714A69AD}","Dynamic Data Partition"],
						["{DE94BBA4-06D1-4D40-A16ABFD50179D6AC}","Windows Recover"],
						["{37AFFC90-EF7D-4e96-91C32D7AE055B174}","IBM GPFS"],
						["{75894C1E-3AEB-11D3-B7C17B03A0000000}","HPUX Data Partition"],
						["{E2A1E728-32E3-11D6-A6827B03A0000000}","HPUX Server Partition"],
						["{A19D880F-05FC-4D3B-A006743F0F84911E}","RAID Partition"],
						["{0657FD6D-A4AB-43C4-84E50933C84B4F4F}","Swap Partition"],
						["{E6D6D379-F507-44C2-A23C238F2A3DF928}","LVM Partition"],
						["{8DA63339-0007-60C0-C436083AC8230908}","Linux Reserved"],
						["{83BD6B9D-7F41-11DC-BE0B001560B84F0F}","FreeBSD Boot Partition"],
						["{516E7CB4-6ECF-11D6-8FF800022D09712B}","FreeBSD Data Partition"],
						["{516E7CB5-6ECF-11D6-8FF800022D09712B}","FreeBSD Swap Partition"],
						["{516E7CB6-6ECF-11D6-8FF800022D09712B}","UFS"],
						["{516E7CBA-6ECF-11D6-8FF800022D09712B}","ZFS"],
						["{48465300-0000-11AA-AA1100306543ECAC}","HFS(HFS+)"],
						["{55465300-0000-11AA-AA1100306543ECAC}","Apple UFS"],
						["{6A898CC3-1DD2-11B2-99A6080020736631}","Apple ZFS"],
						["{52414944-0000-11AA-AA1100306543ECAC}","Apple RAID"],
						["{52414944-5F4F-11AA-AA1100306543ECAC}","Apple RAID(offline)"],
						["{426F6F74-0000-11AA-AA1100306543ECAC}","Apple Boot Partition"],
						["{4C616265-6C00-11AA-AA1100306543ECAC}","Apple Label"],
						["{5265636F-7665-11AA-AA1100306543ECAC}","Apple TV Recover Partition"],
						["{6A82CB45-1DD2-11B2-99A6080020736631}","Solaris Boot Partition"],
						["{6A85CF4D-1DD2-11B2-99A6080020736631}","Solaris Root Partition"],
						["{6A87C46F-1DD2-11B2-99A6080020736631}","Solaris Swap Partition"],
						["{6A8B642B-1DD2-11B2-99A6080020736631}","Solaris Backup Partition"],
						["{6A898CC3-1DD2-11B2-99A6080020736631}","Solaris /usr Partition"],
						["{6A8EF2E9-1DD2-11B2-99A6080020736631}","Solaris /var Partition"],
						["{6A90BA39-1DD2-11B2-99A6080020736631}","Solaris /home Partition"],
						["{49F48D32-B10E-11DC-B99B0019D1879648}","NetBSD Swap Partition"],
						["{49F48D5A-B10E-11DC-B99B0019D1879648}","NetBSD FFS Partition"],
						["{49F48D82-B10E-11DC-B99B0019D1879648}","NetBSD LFS Partition"],
						["{49F48DAA-B10E-11DC-B99B0019D1879648}","NetBSD RAID Partition"],
						["{2DB519EC-B10F-11DC-B99B0019D1879648}","NetBSD Encrypt Partition"],
						["","Unknown Partition/"+This.Val.type],
					],i;
					
					for(i=0;i<Type.length-1;i++)
					{
						if(Type[i][0]==This.Val.type)
						{
							break;
						}
					}
					return [Type[i][1],0];
				}
			},
			{
				Name:"id",
				Desc:"Partition ID",
				Type:['guid',"",16],
				Value:function(Parameters,This,Base)
				{
					return [This.Val.id,(This.Val.type=="{00000000-0000-0000-0000000000000000}")&&(This.Val.id!="{00000000-0000-0000-0000000000000000}")?-1:1];
				},
			},
			{
				Name:"startsector",
				Desc:"Start Sector",
				Type:['uhex',"",8],
				Value:function(Parameters,This,Base)
				{
					var Result=["@"+getSize(MegaHexMulU(This.Val.startsector,Parameters.SectorSize))+"("+This.Val.startsector+"H)",0];
					if((MegaHexCompU(Parameters.FirstSector,This.Val.startsector)<=0)&&
					   (MegaHexCompU(Parameters.LastSector,This.Val.lastsector)>=0))
					{
						Result[1]=1;
					}
					else
					{
						Result[1]=-1;
					}
					
					return Result;
				},
		/*
				Ref:function(Parameters,This,Base)
				{
				}
		*/
			},
			{
				Name:"lastsector",
				Desc:"Last Sector",
				Type:['uhex',"",8],
				Value:function(Parameters,This,Base)
				{
					return ["Size "+getSize(parseInt(MegaHexMulU(MegaHexAddU(MegaHexSubU(This.Val.lastsector,This.Val.startsector),'1'),Parameters.SectorSize),16))+"("+This.Val.lastsector+"H)",MegaHexCompU(This.Val.startsector,This.Val.lastsector)<0?1:-1];
				},
			},
			{
				Name:"attributes",
				Desc:"Attributes",
				Type:['uhex',"",8],
			},
			{
				Name:"name",
				Desc:"Name",
				Type:['unicode16',"",72]
			}
		],
		Neighbor:function(Parameters,This,Base) //(14) The neighbor structure filter
		{
			if(This.Parameters.Index<parseInt(Parameters.EntryCount,16)-1)
			{
				return [["PartTable","gptentry"]];//Multiple type maybe
			}
			else
			{
				return [];//No neighbor, empty array
			}
		}
	};
	
	if(gStructureParser==undefined)
		setTimeout(RegisterStructures,200);
	else
	{
		gStructureParser.Register(mbrpart);
		gStructureParser.Register(mbr);
		gStructureParser.Register(gptheader);
		gStructureParser.Register(gptentry);
	}
}

