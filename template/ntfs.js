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
		Parameters:{RunOffset:'0',ClusterSize:"1000",StartSector:'0',BytesPerSector:'200',ClusterIndex:'0'},
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
						return [""+o+"/"+s,0];
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
				Parameters.OffsetSize=s>>4;
				Parameters.SizeSize=s%16;
				return [
							{Name:"runsize",Desc:"Run Size",Type:["NTFS_variablesize","",s%16]},
							{Name:"runoffset",Desc:"Run Offset",Type:["NTFS_variableoffset","",s>>4]},
					   ];
			}
			else
			{
				return [];
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
		Parameters:{OffsetSize:'1',RunOffset:'0',ClusterSize:"1000",StartSector:'0',BytesPerSector:'200',PreSize:'0'},
		Size:0, //For dynamical size structure
		Members:
		[
			{
				Name:"body",
				Desc:"Value",
				Type:["uhex","OffsetSize",1],
				Value:function(Parameters,This,Base)
				{
					var c=This.Val.body,d,e;
					d=parseInt(c[0],16);
					if((!(c.length&1))&&(d>7))
					{//Negtive
						e=MegaHexSubU(1+_padStart('0',c.length),c);
						if(MegaHexCompU(Parameters.RunOffset,e)<0)
						{
							return ["No. "+Parameters.ClusterIndex+"H,Bad offset/"+This.Val.body+"H",-1];
						}
						d=MegaHexSubU(Parameters.RunOffset,e);
						c=["No. "+Parameters.ClusterIndex+"H,@"+d+"H/(-"+e+"H)",0];
					}
					else
					{
						d=MegaHexAddU(Parameters.RunOffset,c);
						c=["No. "+Parameters.ClusterIndex+"H,@"+d+"H/(+"+c+"H)",0];
					}
					Parameters.ClusterIndex=MegaHexAddU(Parameters.ClusterIndex,Parameters.PreSize);
					Parameters.RunOffset=d;
					return c;
				},
			}
		],
		Next:function(Parameters,This,Base)
		{
			return [{Name:"datarunheader",Desc:"Data Run",Type:["NTFS_datarunheader","",1]}];
		},
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
					Parameters.PreSize=c;
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
		Type:"ntfsbootrecord",
		Name:"NTFS Boot Record",
		Size:["",4096], //For fixed size structure
		Parameters:{StartSector:'0',TotalSectors:'10000',BytesPerSector:'200'},
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
					else if(R[0]>128)
					{
						R[0]=1<<(256-R[0]);
						R[1]=1;
					}
					
					Parameters.ClusterSize=R[0]*parseInt(This.Val.bps,16);
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
					return [getSize(parseInt(MegaHexMulU(Parameters.BytesPerSector,This.Val.totalsectors),16))+"("+AbbrValue(This.Val.totalsectors)+"H)",MegaHexCompU(This.Val.totalsectors,Parameters.TotalSectors)<0?1:-1];
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
					var Result={Ref:{Group:"NTFS",Type:["filerecord"]},StartOffset:MegaHexAddU(MegaHexMulU(Parameters.BytesPerSector,Parameters.StartSector),MegaHexMulU(This.Val.mft,MegaHexMulU(This.Val.spc,This.Val.bps))),Size:"400"};
					Parameters.StartSector=Parameters.StartSector;
					Parameters.StartOffset=Result.StartOffset;
					
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
					var Result={Ref:{Group:"NTFS",Type:["filerecord"]},StartOffset:MegaHexAddU(MegaHexMulU(Parameters.BytesPerSector,Parameters.StartSector),MegaHexMulU(This.Val.mftmirr,MegaHexMulU(This.Val.spc,This.Val.bps))),Size:"400"};
					Parameters.StartSector=Parameters.StartSector;
					Parameters.StartOffset=Result.StartOffset;
					
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
						Parameters.FileRecordSize=(v*parseInt(This.Val.spc,16)*parseInt(This.Val.bps,16)).toString(16);
						return [getSize(v*parseInt(This.Val.spc,16)*parseInt(This.Val.bps,16))+"("+This.Val.frsize+"H)",0];
					}
					else
					{
						Parameters.FileRecordSize=(1<<(256-v)).toString(16);
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
						Parameters.IndexRecordSize=(v*parseInt(This.Val.spc,16)*parseInt(This.Val.bps,16)).toString(16);
						return [getSize(v*parseInt(This.Val.spc,16)*parseInt(This.Val.bps,16))+"("+This.Val.irsize+"H)",0];
					}
					else
					{
						Parameters.IndexRecordSize=(1<<(256-v)).toString(16);
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
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSectors:'10000',SectorsPerCluster:"8",BytesPerSector:'200'},
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
					Parameters.StartSector=Parameters.StartSector;
					
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
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSectors:'10000',SectorsPerCluster:"8",BytesPerSector:'200'},
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
	
	var frr=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"NTFS File Record Reference",
		Author:"Ares Lee from welees.com",
		Type:"frr",
		Name:"File Record Reference",
		Size:["",8], //For fixed size structure
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSectors:'10000',SectorsPerCluster:"8",BytesPerSector:'200'},
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
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSectors:'10000',SectorsPerCluster:"8",BytesPerSector:'200'},
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
							return ['Unknown type('+AbbrValue(This.Val.type)+"H)",-1];
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
			Parameters.type=This.Val.type;
			if(This.Val.nonresidentflag=='00')
			{
				r.push({Name:"resident",Desc:"Resident Data",Type:["NTFS_resident","",8]});
				Parameters.NameSize=parseInt(This.Val.namesize,16);
			}
			else
			{
				r.push({Name:"nonresident",Desc:"Nonresident Data",Type:["NTFS_nonresident","",48]});
				Parameters.StartSector=Parameters.StartSector;
				Parameters.NameSize=parseInt(This.Val.namesize,16);
				if(This.Val.namesize!='00')
				{
					r.push({Name:"name",Desc:"Attribute Name",Type:["unicode16","",parseInt((Parameters.NameSize*2+7)/8)*8]});
				}
				Parameters.DataRunLength=parseInt(This.Val.size,16)-64-parseInt((Parameters.NameSize*2+7)/8)*8;
				Parameters.ClusterIndex='0';
				r.push({Name:"dataruns",Desc:"Data Runs",Type:["NTFS_datarunheader","",Parameters.DataRunLength]});
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
				return [];
			}
		}
	}
	
	var resident=
	{
		Vendor:"weLees Co., LTD",
		Ver:"2.0.0",
		Group:"NTFS",
		Comment:"NTFS resident data desciption of attribute, it is part of attribute",
		Author:"Ares Lee from welees.com",
		Type:"resident",
		Name:"* Resident Data",
		Size:["",8],
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSectors:'10000',SectorsPerCluster:"8",BytesPerSector:'200'},
		Members:
		[
			{
				Name:"datalength",
				Desc:"Data Length",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.datalength)+"H("+parseInt(This.Val.datalength,16)+")",0];
				},
			},
			{
				Name:"dataoffset",
				Desc:"Data Offset",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.dataoffset)+"H",0];
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
			var r=[],s=parseInt(This.Val.datalength,16);
			if(Parameters.NameSize)
			{
				r.push({Name:"name",Desc:"Attribute Name",Type:["unicode16","",parseInt((Parameters.NameSize*2+7)/8)*8]});
			}
			s=parseInt((s+7)/8)*8;
			switch(parseInt(Parameters.type,16))
			{
				case 16:
					r.push({Name:"si",Desc:"Standard Information",Type:["NTFS_si","",s]});
					break;
				case 32:
					r.push({Name:"al",Desc:"Attribute List",Type:["NTFS_al","",s]});
					break;
				case 48:
					r.push({Name:"fn",Desc:"File Name",Type:["NTFS_fn","",s]});
					break;
				case 64:
					r.push({Name:"oi",Desc:"Object ID",Type:["guid","",s]});
					break;
				case 80:
					r.push({Name:"sd",Desc:"Security Descriptor",Type:["NTFS_sd","",s]});
					break;
				case 96:
					r.push({Name:"vn",Desc:"Volume Name",Type:["unicode16","",s]});
					break;
				case 112:
					r.push({Name:"vi",Desc:"Volume Information",Type:["NTFS_vi","",s]});
					break;
				case 128:
					r.push({Name:"d",Desc:"Data",Type:["bytearray","",s]});
					break;
				case 144:
					r.push({Name:"ir",Desc:"Index Root",Type:["NTFS_ir","",16]});
					r.push({Name:"ih",Desc:"Index Header",Type:["NTFS_ih","",s-16]});
					break;
				case 160:
					r.push({Name:"ia",Desc:"Index Allocation",Type:["NTFS_ia","",s]});
					break;
				case 176:
					r.push({Name:"b",Desc:"Bitmap",Type:["bytearray","",s]});
					break;
				case 192:
					r.push({Name:"sl",Desc:"Symbolic Link",Type:["NTFS_sl","",s]});
					break;
				case 208:
					r.push({Name:"eai",Desc:"EA Information",Type:["NTFS_eai","",s]});
					break;
				case 224:
					r.push({Name:"ea",Desc:"EA",Type:["NTFS_ea","",s]});
					break;
				case 240:
					r.push({Name:"ps",Desc:"Property Set",Type:["NTFS_ps","",s]});
					break;
				case 256:
					r.push({Name:"lus",Desc:"Logged Utility Stream",Type:["NTFS_lus","",s]});
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
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSectors:'10000',SectorsPerCluster:"8",BytesPerSector:'200'},
		Members:
		[
			{
				Name:"startvcn",
				Desc:"Start VCN",
				Type:["uhex","",8],
				Value:function(Parameters,This,Base)
				{
					Parameters.RunOffset=This.Val.startvcn;
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
	
	var ih=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"Index Data Header, used for $IndexRoot Attribute and IndexRecord",
		Author:"Ares Lee from welees.com",
		Type:"ih",
		Name:"* Index Data Header",
		Size:["",16],
		Parameters:{StartSector:'0',Rule:'1',FileRecordSize:'400',IndexRecordSize:"1000",TotalSectors:'10000',SectorsPerCluster:"8",BytesPerSector:'200'},
		Members:
		[
			{
				Name:"entryoffset",
				Desc:"First Index Entry Offset",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					return ["+"+AbbrValue(This.Val.entryoffset)+"H",parseInt(This.Val.entryoffset,16)<parseInt(Parameters.IndexRecordSize,16)?1:-1];
				},
				Ref:function(Parameters,This,Base)
				{
					var Result={Ref:{Group:"NTFS",Type:["ief"]},StartOffset:MegaHexAddU(Base,This.Val.entryoffset),Size:"10"};
					Parameters.StartSector=Parameters.StartSector;
					Parameters.StartOffset=Result.StartOffset;
					
					switch(AbbrValue(Parameters.Rule))
					{
						case '0':
							debugger;
							break;
						case '1':
							Result.Ref.Type=["ief"];
							break;
						case '2':
							debugger;
							break;
						case '10':
							debugger;
							break;
						case '11':
							Result.Ref.Type=["iesi"];
							break;
						case '12':
							Result.Ref.Type=["iesh"];
							break;
						case '13':
							Result.Ref.Type=["ieoi"];
							break;
						default:
							debugger;
							break;
					}
					return Result;
				}
			}, 
			{
				Name:"datasize",
				Desc:"Size of Index Node(Header+Entries)",
				Type:["uhex","",4],
			},
			{
				Name:"allocatesize",
				Desc:"Allocated Size",
				Type:["uhex","",4],
			},
			{
				Name:"flags",
				Desc:"Flags",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					var v=parseInt(This.Val.flags,16);
					if(v&1)
					{
						return ["Branch node",1];
					}
					else
					{
						return ["Leaf node",1];
					}
				}
			},
		],
	}
	
	var ief=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"File/Directory Index Entry, to index file object in B tree",
		Author:"Ares Lee from welees.com",
		Type:"ief",
		Name:"Index Entry : File name",
		Size:["",16],
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSectors:'10000',SectorsPerCluster:"8",BytesPerSector:'200'},
		Members:
		[
			{
				Name:"frr",
				Desc:"File Record Reference",
				Type:["NTFS_frr","",8],
			},
			{
				Name:"entrysize",
				Desc:"Entry Size",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.entrysize)+"H",0];
				},
			},
			{
				Name:"keysize",
				Desc:"Key Size",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					return [AbbrValue(This.Val.keysize)+"H",0];
				},
			},
			{
				Name:"flags",
				Desc:"Index Flags",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					var r=["",0],v=parseInt(This.Val.flags,16);
					if(v&1)
					{
						r[0]+="Branch Entry,";
					}
					if(v&2)
					{
						r[0]+="Last Entry,";
					}
					r[0]=r[0].substr(0,r[0].length-1);
					return r;
				},
			},
			{
				Name:"pad",
				Desc:"Pad",
				Type:["uhex","",2],
			},
		],
		Next:function(Parameters,This,Base)
		{
			var v=parseInt(This.Val.flags,16),r=[];
			if(!(v&2))
			{
				r.push({Name:"fileinfo",Desc:"File Information",Type:["NTFS_fn","",parseInt((parseInt(This.Val.keysize,16)+7)/8)*8]});
			}
			if(v&1)
			{
				r.push({Name:"childoffset",Desc:"Child Record Virtual Cluster Offset",Type:["uhex","",8]});
			}
			
			return r;
		},
		Neighbor:function(Parameters,This,Base)
		{
			if(parseInt(This.Val.flags,16)&2)
			{
				return [];//No neighbor, empty array
			}
			else
			{
				return [["NTFS","ief"]];//Multiple type maybe
			}
		}
	}
	
	var ir=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"Data of NTFS Attribute Index Root",
		Author:"Ares Lee from welees.com",
		Type:"ir",
		Name:"* Attribute Data : Index Root",
		Size:["",16],
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSectors:'10000',SectorsPerCluster:"8",BytesPerSector:'200'},
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
							return ['Unknown type('+AbbrValue(This.Val.type)+"H)",-1];
					}
				},
			},
			{
				Name:"collationrule",
				Desc:"Collation Rule",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					Parameters.Rule=This.Val.collationrule;
					switch(parseInt(This.Val.collationrule,16))
					{
						case 0:
							return ["Binary(0)",1];
						case 1:
							return ["File Name(1)",1];
						case 2:
							return ["Unicode(2)",1];
						case 16:
							return ["ULONG(10H)",1];
						case 17:
							return ["Security ID(11H)",1];
						case 18:
							return ["Security Hash(12H)",1];
						case 19:
							return ["ULONG List(13H)",1];
						default:
							return ["Unknown("+This.Val.collationrule+")",-1];
					}
				},
			},
			{
				Name:"irsize",
				Desc:"Index Record Size",
				Type:["uhex","",4],
				Value:function(Parameters,This,Base)
				{
					return [getSize(parseInt(This.Val.irsize,16))+"("+AbbrValue(This.Val.irsize)+"H)",MegaHexCompU(This.Val.irsize,Parameters.IndexRecordSize)==0?1:-1];
				}
			},
			{
				Name:"cpi",
				Desc:"Clusters per IndexRecord",
				Type:["uhex","",4],
			},
		]
	}
	
	var si=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"Data of NTFS attribute standard information",
		Author:"Ares Lee from welees.com",
		Type:"si",
		Name:"* Attribute Data : Standard Information",
		Size:["",48],
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSectors:'10000',SectorsPerCluster:"8",BytesPerSector:'200'},
		Members:
		[
			{
				Name:"createtime",
				Desc:"Create Time",
				Type:["uhex","",8],
			},
			{
				Name:"lastwritetime",
				Desc:"Last Modification Time",
				Type:["uhex","",8],
			},
			{
				Name:"lastfrwritetime",
				Desc:"Last FileRecord Modification Time",
				Type:["uhex","",8],
			},
			{
				Name:"lastaccesstime",
				Desc:"Last Access Time",
				Type:["uhex","",8],
			},
			{
				Name:"attributes",
				Desc:"File Attributes",
				Type:["uhex","",4],
			},
			{
				Name:"maxvernum",
				Desc:"Maximum Version Number",
				Type:["uhex","",4],
			},
			{
				Name:"vernum",
				Desc:"Version Number",
				Type:["uhex","",4],
			},
			{
				Name:"reserved",
				Desc:"Reserved",
				Type:["uhex","",4],
			},
		]
	}
	
	var fn=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"Data of NTFS attribute file name",
		Author:"Ares Lee from welees.com",
		Type:"fn",
		Name:"* Attribute Data : File Name",
		Size:["",48],
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSectors:'10000',SectorsPerCluster:"8",BytesPerSector:'200'},
		Members:
		[
			{
				Name:"parent",
				Desc:"Parent Reference",
				Type:["NTFS_frr","",8],
			},
			{
				Name:"createtime",
				Desc:"Create Time",
				Type:["uhex","",8],
			},
			{
				Name:"lastwritetime",
				Desc:"Last Modification Time",
				Type:["uhex","",8],
			},
			{
				Name:"lastfrwritetime",
				Desc:"Last FileRecord Modification Time",
				Type:["uhex","",8],
			},
			{
				Name:"lastaccesstime",
				Desc:"Last Access Time",
				Type:["uhex","",8],
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
				Name:"filesize",
				Desc:"File Size",
				Type:["uhex","",8],
				Value:function(Parameters,This,Base)
				{
					return [getSize(parseInt(This.Val.filesize,16))+"("+AbbrValue(This.Val.filesize)+"H)",0];
				},
			},
			{
				Name:"attributes",
				Desc:"File Attributes",
				Type:["uhex","",4],
			},
			{
				Name:"easize",
				Desc:"Packed EA Size",
				Type:["uhex","",2],
			},
			{
				Name:"reserved",
				Desc:"Reserved",
				Type:["uhex","",2],
			},
			{
				Name:"namelength",
				Desc:"Name Length",
				Type:["uhex","",1],
			},
			{
				Name:"namespace",
				Desc:"Name Type",
				Type:["uhex","",1],
				Value:function(Parameters,This,Base)
				{
					var r=["",1];
					if(This.Val.namespace=='00')
					{
						r[0]="Posix Name";
					}
					else if(This.Val.namespace=='01')
					{
						r[0]="Long File Name";
					}
					else if(This.Val.namespace=='02')
					{
						r[0]="Short File Name";
					}
					else if(This.Val.namespace=='03')
					{
						r[0]="Long/Short File Name";
					}
					else
					{
						r[0]="Unknown("+This.Val.namespace+"H)";
						r[1]=-1;
					}
					return r;
				},
			},
		],
		Next:function(Parameters,This,Base)
		{
			return [{Name:"filename",Desc:"File Name",Type:["unicode16","",parseInt((parseInt(This.Val.namelength,16)*2+9)/8)*8-2]}];
		},
	}
	
	var vi=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"Data of NTFS Attribute Volume Information",
		Author:"Ares Lee from welees.com",
		Type:"vi",
		Name:"* Attribute Data : Volume Information",
		Size:["",16],
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSectors:'10000',SectorsPerCluster:"8",BytesPerSector:'200'},
		Members:
		[
			{
				Name:"pad1",
				Desc:"Pad",
				Type:["uhex","",8],
			},
			{
				Name:"major",
				Desc:"Major Version",
				Type:["uhex","",1],
			},
			{
				Name:"minor",
				Desc:"Minor Version",
				Type:["uhex","",1],
			},
			{
				Name:"flags",
				Desc:"Flags",
				Type:["uhex","",2],
			},
			{
				Name:"pad2",
				Desc:"Pad",
				Type:["uhex","",4],
			},
		]
	}
	
	var oi=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Group:"NTFS",
		Comment:"Data of Object ID Index Entry",
		Author:"Ares Lee from welees.com",
		Type:"oi",
		Name:"* Index Data : Object ID",
		Size:["",72],
		Parameters:{FileRecordSize:'400',IndexRecordSize:"1000",TotalSectors:'10000',SectorsPerCluster:"8",BytesPerSector:'200'},
		Members:
		[
			{
				Name:"id",
				Desc:"ID",
				Type:["guid","",16],
			},
			{
				Name:"frr",
				Desc:"Host File Record Reference",
				Type:["NTFS_frr","",8],
			},
			{
				Name:"volumeid",
				Desc:"Create Volume ID",
				Type:["guid","",16],
			},
			{
				Name:"objectid",
				Desc:"Create Object ID",
				Type:["guid","",16],
			},
			{
				Name:"domainid",
				Desc:"Domain ID",
				Type:["guid","",16],
			},
		],
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
		gStructureParser.Register(frr);
		gStructureParser.Register(attrhead);
		gStructureParser.Register(resident);
		gStructureParser.Register(nonresident);
		gStructureParser.Register(ih);
		gStructureParser.Register(ief);
		gStructureParser.Register(fn);
		gStructureParser.Register(ir);
		gStructureParser.Register(si);
		gStructureParser.Register(vi);
		gStructureParser.Register(oi);
	}
}
