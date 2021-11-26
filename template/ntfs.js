RegisterStructures();

function RegisterStructures()
{
	var datarunheader=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"Data run of NTFS file system",
		Author:"Ares Lee from welees.com",
		Type:"datarunheader",
		Name:"Data Run",
		Size:["",1], //For fixed size structure
		Parameters:{RunOffset:'0',ClusterSize:"1000",StartSector:'0',SectorSize:'200'},
		Members:
		[
			{
				Name:"header",
				Desc:"Header",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					var o,s=parseInt(This.Val.header,16);
					if(s)
					{
						o=s>>4;
						s%=16;
						return [""+o+"H/"+s+"H",0];
					}
					else
					{
						return ["End",0];
					}
				},
			}
		],
		Next:function(Parameters,This,Base)
		{
			var s=parseInt(This.Val.header,16),k;
			if(s)
			{
				This.Parameters.OffsetSize=s>>4;
				This.Parameters.SizeSize=s%16;
				return [
							{Name:"runsize",Desc:"Run Size",Type:["NTFS_variablesize","",s%16]},
							{Name:"runoffset",Desc:"Run Offset",Type:["NTFS_variableoffset","",s>>4]},
					   ];
			}
			else
			{
				return [];
			}
		},
		Neighbor:function(Parameters,This,Base)
		{
			if(parseInt(This.Val.header,16))
			{
				return [["NTFS","datarunheader"]];//Multiple type maybe
			}
			else
			{
				return [];//No neighbor, empty array
			}
		}
	};
	
	var variableoffset=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"Microsoft variable offset",
		Author:"Ares Lee from welees.com",
		Type:"variableoffset",
		Name:"* Data Run Offset",
		Size:["OffsetSize",1], //For fixed size structure
		Parameters:{OffsetSize:'1',RunOffset:'0',ClusterSize:"1000",StartSector:'0',SectorSize:'200'},
		Size:0, //For dynamical size structure
		Members:
		[
			{
				Name:"body",
				Desc:"Value",
				Type:["uhex","OffsetSize",1],
				Value:function(Parameters,This,Base)
				{
					var c=This.Val.body.replace(/\b(0+)/gi,""),d;
					c=c==''?'0':c;
					d=parseInt(c[0],16);
					if((!c.length&1)&&(d>8))
					{//Negtive
						c=MegaHexSubU(1+_padStart('0',c.length),c);
						if(MegaHexCompU(Parameters.RunOffset,c)<0)
						{
							return ["Bad offset/"+This.Val.body,-1];
						}
						d=MegaHexSubU(Parameters.RunOffset,c);
					}
					else
					{
						d=MegaHexAddU(Parameters.RunOffset,c);
					}
					This.Parameters.RunOffset=d;
					return [d+"H/(+"+c+"H)",0];
				},
	/*
				Ref:function(Parameters,This,Base)
				{
				}
	*/
			}
		]
	};
	
	var variablesize=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"Microsoft variable size",
		Author:"Ares Lee from welees.com",
		Type:"variablesize",
		Name:"* Data Run Size",
		Size:["SizeSize",1], //For fixed size structure
		Parameters:{SizeSize:'1'},
		Size:0, //For dynamical size structure
		Members:
		[
			{
				Name:"body",
				Desc:"Value",
				Type:["uhex","SizeSize",1],
				Value:function(Parameters,This,Base)
				{
					var c=This.Val.body.replace(/\b(0+)/gi,"");
					return [(c==''?'0':c)+'H',0];
				},
			}
		]
	};
	
	var bootsector=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"FileSystem",
		Comment:"NTFS Boot Record, the first sector in NTFS Volume",
		Author:"Ares Lee from welees.com",
		Type:"bootrecord",
		Name:"NTFS Boot Record",
		Size:["",4096], //For fixed size structure
		Parameters:{StartSector:'0',TotalSetors:'10000',SectorSize:'200'},
		Members:
		[
			{
				Name:"jump",
				Desc:"Jump code",
				Type:["bytearray","",3],
			},
			{
				Name:"signature",
				Desc:"Signature",
				Type:["char","",8],
				Value:function(Parameters,This,Base)
				{
					return [This.Val.signature,This.Val.signature=='NTFS    '?1:-1];
				},
			},
			{
				Name:"bps",
				Desc:"Bytes Per Sector",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					var R=[parseInt(This.Val.bps,16),-1];
					if((R[0]==512)||
					   (R[0]==1024)||
					   (R[0]==2048)||
					   (R[0]==4096)||
					   (R[0]==8192)||
					   (R[0]==16384)||
					   (R[0]==32768))
					{
						R[1]=1;
					}
					
					R[0]=getSize(R[0]);
					return R;
				},
			},
			{
				Name:"spc",
				Desc:"Sectors Per Cluster",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					var R=[parseInt(This.Val.spc,16),-1];
					if((R[0]==1)||
					   (R[0]==2)||
					   (R[0]==4)||
					   (R[0]==8)||
					   (R[0]==16)||
					   (R[0]==32)||
					   (R[0]==64)||
					   (R[0]==128))
					{
						R[1]=1;
					}
					
					This.Parameters.ClusterSize=R[0]*parseInt(This.Val.bps,16);
					R[0]=getSize(R[0]*parseInt(This.Val.bps,16))+"("+This.Val.spc+"H)";
					return R;
				},
			},
			{
				Name:"rsvsectors",
				Desc:"Reserved Sectors",
				Type:["uhex","",2],
			},
			{
				Name:"pad1",
				Desc:"Pad",
				Type:["uhex","",5],
			},
			{
				Name:"media",
				Desc:"Media Type",
				Type:["uhex","",1],
			},
			{
				Name:"pad2",
				Desc:"Pad",
				Type:["uhex","",2],
			},
			{
				Name:"spt",
				Desc:"Sectors Per Track",
				Type:["uhex","",2],
			},
			{
				Name:"heads",
				Desc:"Heads",
				Type:["uhex","",2],
			},
			{
				Name:"hiddensectors",
				Desc:"Hidden Sectors",
				Type:["uhex","",4],
			},
			{
				Name:"pad3",
				Desc:"Pad",
				Type:["uhex","",4],
			},
			{
				Name:"curdisk",
				Desc:"Current Disk",
				Type:["uhex","",1],
			},
			{
				Name:"pad4",
				Desc:"Pad",
				Type:["uhex","",3],
			},
			{
				Name:"totalsectors",
				Desc:"Sectors In Volume",
				Type:["uhex","",8],
				Value:function(Parameters,This,Base)
				{
					return [getSize(parseInt(MegaHexMulU(Parameters.SectorSize,This.Val.totalsectors),16))+"("+AbbrValue(This.Val.totalsectors)+"H)",MegaHexCompU(This.Val.totalsectors,Parameters.TotalSectors)<0?1:-1];
				},
			},
			{
				Name:"mft",
				Desc:"$MFT Cluster Offset",
				Type:["uhex","",8],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.mft)+"H",MegaHexCompU(MegaHexMulU(This.Val.mft,This.Val.spc),This.Val.totalsectors)<0?1:-1];
				},
				Ref:function(Parameters,This,Base)
				{
					var Result={Ref:{Group:"NTFS",Type:["filerecord"]},StartOffset:MegaHexAddU(MegaHexMulU(Parameters.SectorSize,Parameters.StartSector),MegaHexMulU(This.Val.mft,MegaHexMulU(This.Val.spc,This.Val.bps))),Size:"400"};
					This.Parameters.StartSector=Parameters.StartSector;
					This.Parameters.StartOffset=Result.StartOffset;
					
					return Result;
				}
			},
			{
				Name:"mftmirr",
				Desc:"$MFTMirr Cluster Offset",
				Type:["uhex","",8],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.mftmirr)+"H",((This.Val.mft!=This.Val.mftmirr)&&(MegaHexCompU(MegaHexMulU(This.Val.mft,This.Val.spc),This.Val.totalsectors)<0))?1:-1];
				},
				Ref:function(Parameters,This,Base)
				{
					var Result={Ref:{Group:"NTFS",Type:["filerecord"]},StartOffset:MegaHexAddU(MegaHexMulU(Parameters.SectorSize,Parameters.StartSector),MegaHexMulU(This.Val.mftmirr,MegaHexMulU(This.Val.spc,This.Val.bps))),Size:"400"};
					This.Parameters.StartSector=Parameters.StartSector;
					This.Parameters.StartOffset=Result.StartOffset;
					
					return Result;
				}
			},
			{
				Name:"frsize",
				Desc:"File Record Size",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					var v=parseInt(This.Val.frsize,16);
					if(v<128)
					{
						This.Parameters.FileRecordSize=(v*parseInt(This.Val.spc,16)*parseInt(This.Val.bps,16)).toString(16);
						return [getSize(v*parseInt(This.Val.spc,16)*parseInt(This.Val.bps,16))+"("+This.Val.frsize+"H)",0];
					}
					else
					{
						This.Parameters.FileRecordSize=(1<<(256-v)).toString(16);
						return [getSize(1<<(256-v))+"("+This.Val.frsize+"H)",0];
					}
				},
			},
			{
				Name:"pad5",
				Desc:"Pad",
				Type:["uhex","",3],
			},
			{
				Name:"irsize",
				Desc:"Index Record Size",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					var v=parseInt(This.Val.irsize,16);
					if(v<128)
					{
						This.Parameters.IndexRecordSize=(v*parseInt(This.Val.spc,16)*parseInt(This.Val.bps,16)).toString(16);
						return [getSize(v*parseInt(This.Val.spc,16)*parseInt(This.Val.bps,16))+"("+This.Val.irsize+"H)",0];
					}
					else
					{
						This.Parameters.IndexRecordSize=(1<<(256-v)).toString(16);
						return [getSize(1<<(256-v))+"("+This.Val.irsize+"H)",0];
					}
				},
			},
			{
				Name:"pad6",
				Desc:"Pad",
				Type:["uhex","",3],
			},
			{
				Name:"serial",
				Desc:"Volume Serial Number",
				Type:["uhex","",8],
			},
			{
				Name:"checksum",
				Desc:"Boot Record Checksum",
				Type:["uhex","",4],
			},
		],
	};
	
	var filerecord=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"NTFS File Record",
		Author:"Ares Lee from welees.com",
		Type:"filerecord",
		Name:"NTFS File Record",
		Size:["FileRecordSize",1024], //For fixed size structure
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSetors:'10000',SectorsPerCluster:"8",SectorSize:'200'},
		Members:
		[
			{
				Name:"signature",
				Desc:"Signature",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					if(This.Val.signature=='454C4946')
					{
						return ["FILE",1];
					}
					else
					{
						return [This.Val.signature,-1];
					}
				},
			},
			{
				Name:"upseqoff",
				Desc:"Update Sequence Offset",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					return [This.Val.upseqoff,MegaHexCompU(This.Val.upseqoff,Parameters.FileRecordSize)<0?1:-1];
				},
			},
			{
				Name:"upseqcount",
				Desc:"Update Sequence Count",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					return [This.Val.upseqcount,MegaHexCompU(((parseInt(This.Val.upseqcount,16)-1)*512).toString(16),Parameters.FileRecordSize)==0?1:-1];
				},
			},
			{
				Name:"logrecord",
				Desc:"Log Record Sequence Number",
				Type:["uhex","",8],
			},
			
			{
				Name:"usedcount",
				Desc:"Used Count",
				Type:["uhex","",2],
			},
			{
				Name:"hdlinkcount",
				Desc:"Hard Link Count",
				Type:["uhex","",2],
			},
			{
				Name:"attroffset",
				Desc:"First Attribute Offset",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					return [This.Val.attroffset,((parseInt(This.Val.attroffset,16)%8)==0)&&(MegaHexCompU(This.Val.attroffset,Parameters.FileRecordSize)<0)?1:-1];
				},
				Ref:function(Parameters,This,Base)
				{
					var Result={Ref:{Group:"NTFS",Type:["attrhead"]},StartOffset:MegaHexAddU(Base,This.Val.attroffset),Size:Parameters.FileRecordSize};
					//This.Parameters.StartSector=Parameters.StartSector;
					
					return Result;
				}
			},
			{
				Name:"flags",
				Desc:"Flags",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					var r=['',0],v=parseInt(This.Val.flags);
					r[0]+=(v&1)?"Used,":"Unuse,";
					r[0]+=(v&2)?"Directory,":"";
					r[0]=r[0].substr(0,r[0].length-1);
					return r;
				},
			},
			{
				Name:"datasize",
				Desc:"Used Size in FileRecord",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.datasize)+"H",MegaHexCompU(This.Val.datasize,This.Val.allocatedsize)<=0?1:-1];
				},
			},
			{
				Name:"allocatedsize",
				Desc:"FileRecord Size",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					return [getSize(parseInt(This.Val.allocatedsize,16))+"("+AbbrValue(This.Val.allocatedsize)+"H)",MegaHexCompU(This.Val.allocatedsize,Parameters.FileRecordSize)==0?1:-1];
				},
			},
			{
				Name:"hostfr",
				Desc:"Host FileRecord",
				Type:["NTFS_frr","",8],
			},
			{
				Name:"nextattrid",
				Desc:"ID for next attribute",
				Type:["uhex","",2],
			},
			{
				Name:"frindexhigh",
				Desc:"Index of Current FileRecord(High)",
				Type:["uhex","",2],
			},
			{
				Name:"frindexlow",
				Desc:"Index of Current FileRecord(Low)",
				Type:["uhex","",4],
			},
		],
		Neighbor:function(Parameters,This,Base)
		{
			return [["NTFS","filerecord"]];//Multiple type maybe
		}
	};
	
	var indexrecord=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"NTFS Index Record, the Index Record is container for indexed data such as file name, security data and object ID",
		Author:"Ares Lee from welees.com",
		Type:"indexrecord",
		Name:"NTFS Index Record",
		Size:["IndexRecordSize",4096], //For fixed size structure
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSetors:'10000',SectorsPerCluster:"8",SectorSize:'200'},
		Members:
		[
			{
				Name:"signature",
				Desc:"Signature",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					if(This.Val.signature=='58444E49')
					{
						return ["INDX",1];
					}
					else
					{
						return [This.Val.signature,-1];
					}
				},
			},
			{
				Name:"upseqoff",
				Desc:"Update Sequence Offset",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					return [This.Val.upseqoff,MegaHexCompU(This.Val.upseqoff,Parameters.IndexRecordSize)<0?1:-1];
				},
			},
			{
				Name:"upseqcount",
				Desc:"Update Sequence Count",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					return [This.Val.upseqcount,MegaHexCompU(((parseInt(This.Val.upseqcount,16)-1)*512).toString(16),Parameters.IndexRecordSize)==0?1:-1];
				},
			},
			{
				Name:"logrecord",
				Desc:"Log Record Sequence Number",
				Type:["uhex","",8],
			},
			
			{
				Name:"vcn",
				Desc:"Virtual Cluster Offset",
				Type:["uhex","",8],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.vcn)+"H",0];
				},
			},
			{
				Name:"indexheader",
				Desc:"Index Header",
				Type:["NTFS_ih","",16],
			},
		]
	};
	
	var clientrecord=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"NTFS Log Client Record",
		Author:"Ares Lee from welees.com",
		Type:"clientrecord",
		Name:"NTFS Log Client Record",
		Size:["",160], //For fixed size structure
		Parameters:{SystemPageSize:'1000',LogPageSize:'1000',FileRecordSize:'400',IndexRecordSize:"1000",TotalSetors:'10000',SectorsPerCluster:"8",SectorSize:'200'},
		Members:
		[
			{
				Name:"oldestlsn",
				Desc:"Oldest LSN",
				Type:["uhex","",8],
/*
				Value:function(Parameters,This,Base)
				{
					if(This.Val.signature=='52545352')
					{
						return ["RSTR",1];
					}
					else
					{
						return [This.Val.signature,-1];
					}
				},
*/
			},
			{
				Name:"clientrestartlsn",
				Desc:"LSN of Client Restart",
				Type:["uhex","",8],
			},
			{
				Name:"prevclient",
				Desc:"Previous Client",
				Type:["uhex","",2],
			},
			{
				Name:"nextclient",
				Desc:"Next Client",
				Type:["uhex","",2],
			},
			{
				Name:"seqnum",
				Desc:"Sequence Number",
				Type:["uhex","",2],
			},
			{
				Name:"pad",
				Desc:"Pad",
				Type:["uhex","",6],
			},
			{
				Name:"clientnamelength",
				Desc:"Client Name Length",
				Type:["uhex","",4],
			},
			{
				Name:"clientname",
				Desc:"Client Name",
				Type:["unicode16","",128],
			},
		],
	};
	
	var frr=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"NTFS File Record Referencer",
		Author:"Ares Lee from welees.com",
		Type:"frr",
		Name:"File Record Referencer",
		Size:["",8], //For fixed size structure
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSetors:'10000',SectorsPerCluster:"8",SectorSize:'200'},
		Members:
		[
			{
				Name:"index",
				Desc:"FileRecord Index",
				Type:["uhex","",6],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.index),0];
				},
			},
			{
				Name:"usedcount",
				Desc:"Used Count",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.usedcount),0];
				},
			},
		]
	}
	
	var attrhead=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"NTFS Attribute header",
		Author:"Ares Lee from welees.com",
		Type:"attrhead",
		Name:"Attribute",
		Size:["",16],
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSetors:'10000',SectorsPerCluster:"8",SectorSize:'200'},
		Members:
		[
			{
				Name:"type",
				Desc:"Type",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					switch(parseInt(This.Val.type,16))
					{
						case 16:
							return ['Standard Information(10H)',1];
						case 32:
							return ['Attribute List(20H)',1];
						case 48:
							return ['File Name(30H)',1];
						case 64:
							return ['Object ID(40H)',1];
						case 80:
							return ['Security Descriptor(50H)',1];
						case 96:
							return ['Volume Name(60H)',1];
						case 112:
							return ['Volume Information(70H)',1];
						case 128:
							return ['Data(80H)',1];
						case 144:
							return ['Index Root(90H)',1];
						case 160:
							return ['Index Allocation(A0H)',1];
						case 176:
							return ['Bitmap(B0H)',1];
						case 192:
							return ['Symbolic Link(C0H)',1];
						case 208:
							return ['EA Information(D0H)',1];
						case 224:
							return ['EA(E0H)',1];
						case 240:
							return ['Property Set(F0H)',1];
						case 256:
							return ['Logged Utility Stream(100H)',1];
						case 0xffffffff:
							return ['Last Node(FFFFFFFFH)',1];
						default:
							return ['Unknown type('+AbbrValue(This.Val.type)+"H)",1];
					}
				},
			},
			{
				Name:"size",
				Desc:"Size",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.size)+"H",0];
				},
			},
			{
				Name:"nonresidentflag",
				Desc:"Non-resident Flag",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					if(This.Val.nonresidentflag=='00')
					{
						return ["Resident Attribute",1];
					}
					else if(This.Val.nonresidentflag=='01')
					{
						return ["Non-resident Attribute",1];
					}
					else
					{
						return ["Unknown("+This.Val.nonresidentflag+"H)",-1];
					}
				},
			},
			{
				Name:"namesize",
				Desc:"Size of Attribute Name",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					if(This.Val.namesize=='00')
					{
						return ['No Attribute Name',0];
					}
					else
					{
						return [This.Val.namesize,0];
					}
				},
			},
			{
				Name:"nameoffset",
				Desc:"Offset of Attribute Name",
				Type:["uhex","",2],
			},
			{
				Name:"flags",
				Desc:"Flags",
				Type:["uhex","",2],
			},
			{
				Name:"id",
				Desc:"ID",
				Type:["uhex","",2],
			},
		],
		Next:function(Parameters,This,Base)
		{
			var r=[];
			This.Parameters.type=This.Val.type;
			if(This.Val.nonresidentflag=='00')
			{
				r.push({Name:"resident",Desc:"Resident Data",Type:["NTFS_resident","",8]});
				if(This.Val.namesize!='00')
				{
					This.Parameters.NameSize=parseInt(This.Val.namesize,16);
				}
			}
			else
			{
				r.push({Name:"nonresident",Desc:"Nonresident Data",Type:["NTFS_nonresident","",48]});
				This.Parameters.StartSector=Parameters.StartSector;
				debugger;
				This.Parameters.NameSize=parseInt(This.Val.namesize,16);
				if(This.Val.namesize!='00')
				{
					r.push({Name:"name",Desc:"Attribute Name",Type:["unicode16","",parseInt((This.Parameters.NameSize*2+7)/8)*8]});
				}
				This.Parameters.DataRunLength=parseInt(This.Val.size,16)-64-parseInt((This.Parameters.NameSize*2+7)/8)*8;
				r.push({Name:"dataruns",Desc:"Data Runs",Type:["ntfsdatarun","",This.Parameters.DataRunLength]});
			}
			
			return r;
		},
		Neighbor:function(Parameters,This,Base)
		{
			if(This.Val.type!='FFFFFFFF')
			{
				return [["NTFS","attrhead"]];//Multiple type maybe
			}
			else
			{
				return [[]];
			}
		}
	}
	
	var resident=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"NTFS resident data desciption of attribute, it is part of attribute",
		Author:"Ares Lee from welees.com",
		Type:"resident",
		Name:"* Resident Data",
		Size:["",8],
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSetors:'10000',SectorsPerCluster:"8",SectorSize:'200'},
		Members:
		[
			{
				Name:"datalength",
				Desc:"Data Length",
				Type:["uhex","",4],
			},
			{
				Name:"dataoffset",
				Desc:"Data Offset",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.dataoffset),0];
				},
			},
			{
				Name:"idxflag",
				Desc:"Index Flag",
				Type:["uhex","",1],
			},
			{
				Name:"pad",
				Desc:"Pad",
				Type:["uhex","",1],
			},
		],
		Next:function(Parameters,This,Base)
		{
			var r=[];
			if(This.Parameters.NameSize)
			{
				r.push({Name:"name",Desc:"Attribute Name",Type:["unicode16","",parseInt((This.Parameters.NameSize*2+7)/8)*8]});
			}
			switch(parseInt(This.Parameters.type,16))
			{
				case 16:
					r.push({Name:"si",Desc:"Standard Information",Type:["NTFS_si","",parseInt(This.Val.datalength,16)]});
					break;
				case 32:
					r.push({Name:"al",Desc:"Attribute List",Type:["NTFS_al","",parseInt(This.Val.datalength,16)]});
					break;
				case 48:
					r.push({Name:"fn",Desc:"File Name",Type:["NTFS_fn","",parseInt(This.Val.datalength,16)]});
					break;
				case 64:
					r.push({Name:"oi",Desc:"Object ID",Type:["guid","",parseInt(This.Val.datalength,16)]});
					break;
				case 80:
					r.push({Name:"sd",Desc:"Security Descriptor",Type:["NTFS_sd","",parseInt(This.Val.datalength,16)]});
					break;
				case 96:
					r.push({Name:"vn",Desc:"Volume Name",Type:["unicode16","",parseInt((parseInt(This.Val.datalength,16)+7)/8)*8]});
					break;
				case 112:
					r.push({Name:"vi",Desc:"Volume Information",Type:["NTFS_vi","",parseInt(This.Val.datalength,16)]});
					break;
				case 128:
					r.push({Name:"d",Desc:"Data",Type:["ntfsdatarun","",parseInt((parseInt(This.Val.datalength,16)+7)/8)*8]});
					break;
				case 144:
					r.push({Name:"ir",Desc:"Index Root",Type:["NTFS_ir","",16]});
					r.push({Name:"ih",Desc:"Index Header",Type:["NTFS_ih","",parseInt(This.Val.datalength,16)-16]});
					break;
				case 160:
					r.push({Name:"ia",Desc:"Index Allocation",Type:["NTFS_ia","",parseInt(This.Val.datalength,16)]});
					break;
				case 176:
					r.push({Name:"b",Desc:"Bitmap",Type:["bytearray","",parseInt((parseInt(This.Val.datalength,16)+7)/8)*8]});
					break;
				case 192:
					r.push({Name:"sl",Desc:"Symbolic Link",Type:["NTFS_sl","",parseInt(This.Val.datalength,16)]});
					break;
				case 208:
					r.push({Name:"eai",Desc:"EA Information",Type:["NTFS_eai","",parseInt(This.Val.datalength,16)]});
					break;
				case 224:
					r.push({Name:"ea",Desc:"EA",Type:["NTFS_ea","",parseInt(This.Val.datalength,16)]});
					break;
				case 240:
					r.push({Name:"ps",Desc:"Property Set",Type:["NTFS_ps","",parseInt(This.Val.datalength,16)]});
					break;
				case 256:
					r.push({Name:"lus",Desc:"Logged Utility Stream",Type:["NTFS_lus","",parseInt(This.Val.datalength,16)]});
					break;
			}
			
			return r;
		},
	}
	
	var nonresident=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"NTFS non-resident data desciption of attribute, it is part of Attribute",
		Author:"Ares Lee from welees.com",
		Type:"nonresident",
		Name:"* Non-resident Data",
		Size:["",48],
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSetors:'10000',SectorsPerCluster:"8",SectorSize:'200'},
		Members:
		[
			{
				Name:"startvcn",
				Desc:"Start VCN",
				Type:["uhex","",8],
				Value:function(Parameters,This,Base)
				{
					This.Parameters.RunOffset=This.Val.startvcn;
					return [AbbrValue(This.Val.startvcn)+"H",0];
				},
			},
			{
				Name:"lastvcn",
				Desc:"Last VCN",
				Type:["uhex","",8],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.lastvcn)+"H",0];
				},
			},
			{
				Name:"runoffset",
				Desc:"Data Run Offset",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.runoffset)+"H",0];
				},
			},
			{
				Name:"compressunitsize",
				Desc:"Compress Unit Size",
				Type:["uhex","",1],
			},
			{
				Name:"pad",
				Desc:"Pad",
				Type:["uhex","",5],
			},
			{
				Name:"allocatesize",
				Desc:"Allocated Size",
				Type:["uhex","",8],
				Value:function(Parameters,This,Base)
				{
					return [getSize(parseInt(This.Val.allocatesize,16))+"("+AbbrValue(This.Val.allocatesize)+"H)",0];
				},
			},
			{
				Name:"datasize",
				Desc:"Data Size",
				Type:["uhex","",8],
				Value:function(Parameters,This,Base)
				{
					return [getSize(parseInt(This.Val.datasize,16))+"("+AbbrValue(This.Val.datasize)+"H)",0];
				},
			},
			{
				Name:"initsize",
				Desc:"Initialized Data Size",
				Type:["uhex","",8],
				Value:function(Parameters,This,Base)
				{
					return [getSize(parseInt(This.Val.initsize,16))+"("+AbbrValue(This.Val.initsize)+"H)",0];
				},
			},
		]
	}
	

	if(gStructureParser==undefined)
		setTimeout(RegisterStructures,200);
	else
	{
		gStructureParser.Register(variableoffset);
		gStructureParser.Register(variablesize);
		gStructureParser.Register(datarunheader);
		gStructureParser.Register(bootsector);
		gStructureParser.Register(filerecord);
		gStructureParser.Register(indexrecord);
		gStructureParser.Register(clientrecord);
		gStructureParser.Register(frr);
		gStructureParser.Register(attrhead);
		gStructureParser.Register(resident);
		gStructureParser.Register(nonresident);
	}
}
