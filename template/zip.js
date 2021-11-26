RegisterDiskStructures(); //To register parser when script was loaded

function RegisterDiskStructures()
{
	var zipstructheader= //A structure parser, here is the indicator section of ZIP structures
	{
		Vendor:"weLees Co., LTD", //vendor information
		Ver:"1.0.0", //version
		Comment:"ZIP strcuture standard header, user should use this type for all ZIP structures, it will guide to corresponding structure.",
		Author:"Ares Lee",
		Group:"File",
		Type:"zipstructheader", //The type of structure, just like int/guid. other structures refer current structure by the type
		Name:"ZIP Record Common Header", //To show
		Size:["",4], //For fixed size structure
		Parameters:{}, //Default parameters, if user has not specified, parser will use these settings
		Members:
		[
			{
				Name:"signature",
				Desc:"Signature",
				Type:["uhex","",2], //uhex/hex/oct/uoct/udec/dec/bin/guid, bytes
				Value:function(Parameters,This,Base)
				{
					if(This.Val.signature=='4B50')
					{
						return ['PK',1];
					}
					else
					{
						return [This.Val.signature,-1];
					}
				}
			},
			{
				Name:"type",
				Desc:"Type",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					var Data=[
						['',['Unknown('+This.Val.type+")",-1]],
						['0807',['Data Descriptor',1]],
						['0605',['End Indicator',1]],
						['0505',['Digital Signature',1]],
						['0403',['File Reord',1]],
						['0201',['Dir Entry',1]]
					],i;
					for(i=Data.length-1;i>0;i--)
					{
						if(This.Val.type==Data[i][0])
						{
							break;
						}
					}
					return Data[i][1];
				}
			}
		],
		Next:function(Parameters,This,Base)
		{
			var Data=[
				['',{}],
				['0807',
					[{
						Name:"datadesc",
						Desc:"Data Descriptor",
						Type:["File_zipdatadesc","",12]
					}]
				],
				['0605',
					[{
						Name:"endindicator",
						Desc:"End Indicator",
						Type:["File_zipendindicator","",18]
					}]
				],
				['0505',
					[{
						Name:"digitalsig",
						Desc:"Digital Signature",
						Type:["File_zipdigitalsig","",2]
					}]
				],
				['0403',
					[{
						Name:"filerecord",
						Desc:"File Record",
						Type:["File_zipfilerecord","",26]
					}]
				],
				['0201',
					[{
						Name:"direntry",
						Desc:"Dir Entry",
						Type:["File_zipdirentry","",42]
					}]
				]
			],i;
			for(i=Data.length-1;i>0;i--)
			{
				if(This.Val.type==Data[i][0])
				{
					break;
				}
			}
			return Data[i][1];
		},
		Neighbor:function(Parameters,This,Base)
		{
			if(This.Val.type!='0605')
			{
				return [["File","zipstructheader"]];//Multiple type maybe
			}
			else
			{
				return [];//No neighbor, empty array
			}
		}
	},
	zipfilerecord=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Comment:"ZIP File Record, co-structure of ZIP Record Common Header, Please try to parse via ZIP Record Common Header, the template will detect correct structure and parse",
		Author:"Ares Lee",
		Group:"File",
		Type:"zipfilerecord",
		Name:"* ZIP File Record",
		Size:["",26], //For fixed size structure
		Parameters:{}, //Default parameters, if user has not specified, parser will use these settings
		Members:
		[
			{
				Name:"version",
				Desc:"Version",
				Type:["uhex","",2]
			},
			{
				Name:"flags",
				Desc:"Flags",
				Type:["uhex","",2]
			},
			{
				Name:"compresstype",
				Desc:"Compress Type",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					var Data=[
						['',['Unknown('+This.Val.compresstype+"H)",-1]],
						['0000',['Stored(00)',1]],
						['0001',['Shrunk(01)',1]],
						['0002',['Reuced1(02)',1]],
						['0003',['Reuced2(03)',1]],
						['0004',['Reuced3(04)',1]],
						['0005',['Reuced4(05)',1]],
						['0006',['Imploded(06)',1]],
						['0007',['Token(07)',1]],
						['0008',['Deflate(08)',1]],
						['0009',['Deflate64(09)',1]]
					],i;
					for(i=Data.length-1;i>0;i--)
					{
						if(This.Val.compresstype==Data[i][0])
						{
							break;
						}
					}
					return Data[i][1];
				}
			},
			{
				Name:"filetime",
				Desc:"File Time",
				Type:["dostime","",2],
			},
			{
				Name:"filedate",
				Desc:"File Date",
				Type:["dosdate","",2],
			},
			{
				Name:"crc",
				Desc:"CRC",
				Type:["uhex","",4],
			},
			{
				Name:"compressedsize",
				Desc:"Compressed Size",
				Type:["uhex","",4],
			},
			{
				Name:"uncompressedsize",
				Desc:"Uncompressed Size",
				Type:["uhex","",4],
			},
			{
				Name:"filenamesize",
				Desc:"File Name Size",
				Type:["uhex","",2],
			},
			{
				Name:"exfieldsize",
				Desc:"Extra Field Size",
				Type:["uhex","",2],
			},
		],
		Next:function(Parameters,This,Base)
		{
			var Result=[];
			if(MegaHexCompU(This.Val.filenamesize,'0')!=0)
			{
				Result.push({
					Name:"filename",
					Desc:"File Name",
					Type:["char","",parseInt(This.Val.filenamesize,16)]
				});
			}
			if(MegaHexCompU(This.Val.exfieldsize,'0')!=0)
			{
				Result.push({
					Name:"extradata",
					Desc:"Extra Data",
					Type:["bytearray","",parseInt(This.Val.exfieldsize,16)],
				});
			}
			if(MegaHexCompU(This.Val.compressedsize,'0')!=0)
			{
				Result.push({
					Name:"compressdata",
					Desc:"Compressed Data",
					Type:["bytearray","",parseInt(This.Val.compressedsize,16)]
				});
			}
			return Result;
		}
	},
	zipdirentry=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Comment:"ZIP Dir Entry, co-structure of ZIP Record Common Header, Please try to parse via ZIP Record Common Header, the template will detect correct structure and parse",
		Author:"Ares Lee",
		Group:"File",
		Type:"zipdirentry",
		Name:"* ZIP Dir Entry",
		Size:["",42], //For fixed size structure
		Parameters:{}, //Default parameters, if user has not specified, parser will use these settings
		Members:
		[
			{
				Name:"versionmadeby",
				Desc:"Version Made By",
				Type:["uhex","",2]
			},
			{
				Name:"versiontoextract",
				Desc:"Version To Extract",
				Type:["uhex","",2]
			},
			{
				Name:"flags",
				Desc:"Flags",
				Type:["uhex","",2]
			},
			{
				Name:"compresstype",
				Desc:"Compress Type",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					var Data=[
						['',['Unknown('+This.Val.compresstype+"H)",-1]],
						['0000',['Stored(00)',1]],
						['0001',['Shrunk(01)',1]],
						['0002',['Reuced1(02)',1]],
						['0003',['Reuced2(03)',1]],
						['0004',['Reuced3(04)',1]],
						['0005',['Reuced4(05)',1]],
						['0006',['Imploded(06)',1]],
						['0007',['Token(07)',1]],
						['0008',['Deflate(08)',1]],
						['0009',['Deflate64(09)',1]]
					],i;
					for(i=Data.length-1;i>0;i--)
					{
						if(This.Val.compresstype==Data[i][0])
						{
							break;
						}
					}
					return Data[i][1];
				}
			},
			{
				Name:"filetime",
				Desc:"File Time",
				Type:["dostime","",2],
			},
			{
				Name:"filedate",
				Desc:"File Date",
				Type:["dosdate","",2],
			},
			{
				Name:"crc",
				Desc:"CRC",
				Type:["uhex","",4],
			},
			{
				Name:"compressedsize",
				Desc:"Compressed Size",
				Type:["uhex","",4],
			},
			{
				Name:"uncompressedsize",
				Desc:"Uncompressed Size",
				Type:["uhex","",4],
			},
			{
				Name:"filenamesize",
				Desc:"File Name Size",
				Type:["uhex","",2],
			},
			{
				Name:"exfieldsize",
				Desc:"Extra Field Size",
				Type:["uhex","",2],
			},
			{
				Name:"filecommentlength",
				Desc:"File Comment Size",
				Type:["uhex","",2],
			},
			{
				Name:"disknumberstart",
				Desc:"Disk Number Start",
				Type:["uhex","",2],
			},
			{
				Name:"interattributes",
				Desc:"Internal Attributes",
				Type:["uhex","",2],
			},
			{
				Name:"exterattributes",
				Desc:"External Attributes",
				Type:["uhex","",4],
			},
			{
				Name:"headeroffset",
				Desc:"Header Offset",
				Type:["uhex","",4],
			},
		],
		Next:function(Parameters,This,Base)
		{
			var Result=[];
			if(MegaHexCompU(This.Val.filenamesize,'0')!=0)
			{
				Result.push({
					Name:"filename",
					Desc:"File Name",
					Type:["char","",parseInt(This.Val.filenamesize,16)]
				});
			}
			if(MegaHexCompU(This.Val.exfieldsize,'0')!=0)
			{
				Result.push({
					Name:"extradata",
					Desc:"Extra Data",
					Type:["bytearray","",parseInt(This.Val.exfieldsize,16)]
				});
			}
			if(MegaHexCompU(This.Val.filecommentlength,'0')!=0)
			{
				Result.push({
					Name:"filecomment",
					Desc:"File Comment Data",
					Type:["bytearray","",parseInt(This.Val.filecommentlength,16)]
				});
			}
			return Result;
		}
	},
	zipendindicator=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Comment:"ZIP file end indicator, co-structure of ZIP Record Common Header, Please try to parse via ZIP Record Common Header, the template will detect correct structure and parse",
		Author:"Ares Lee",
		Group:"File",
		Type:"zipendindicator",
		Name:"* ZIP End Indicator",
		Size:["",18], //For fixed size structure
		Parameters:{}, //Default parameters, if user has not specified, parser will use these settings
		Members:
		[
			{
				Name:"disknumber",
				Desc:"Disk Number",
				Type:["uhex","",2]
			},
			{
				Name:"startdisknumber",
				Desc:"Start Disk Number",
				Type:["uhex","",2]
			},
			{
				Name:"entrycountondisk",
				Desc:"Entries on Disk",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					return [''+parseInt(This.Val.entrycountondisk,16),0];
				}
			},
			{
				Name:"entrycountindir",
				Desc:"Entries in Directory",
				Type:["uhex","",2],
				Value:function(Parameters,This,Base)
				{
					return [''+parseInt(This.Val.entrycountindir,16),0];
				}
			},
			{
				Name:"dirsize",
				Desc:"Directory Size",
				Type:["uhex","",4]
			},
			{
				Name:"diroffset",
				Desc:"Directory Offset",
				Type:["uhex","",4]
			},
			{
				Name:"commentsize",
				Desc:"Comment Size",
				Type:["uhex","",2],
			},
		],
		Next:function(Parameters,This,Base)
		{
			var Result=[];
			if(MegaHexCompU(This.Val.commentsize,'0')!=0)
			{
				Result.push({
					Name:"comment",
					Desc:"Comment",
					Type:["char","",parseInt(This.Val.commentsize,16)]
				});
			}
			return Result;
		}
	},
	zipdigitalsig=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Comment:"ZIP file parser",
		Author:"Ares Lee",
		Group:"File",
		Type:"zipdigitalsig",
		Name:"* ZIP Digital Signature",
		Size:["",2], //For fixed size structure
		Parameters:{}, //Default parameters, if user has not specified, parser will use these settings
		Members:
		[
			{
				Name:"datalength",
				Desc:"Data Length",
				Type:["uhex","",2]
			},
		],
		Next:function(Parameters,This,Base)
		{
			var Result=[];
			if(MegaHexCompU(This.Val.datalength,'0')!=0)
			{
				Result.push({
					Name:"data",
					Desc:"Digital Signature Data",
					Type:["char","",parseInt(This.Val.datalength,16)]
				});
			}
			return Result;
		}
	},
	zipdatadesc=
	{
		Vendor:"weLees Co., LTD",
		Ver:"1.0.0",
		Comment:"ZIP data description, co-structure of ZIP Record Common Header, Please try to parse via ZIP Record Common Header, the template will detect correct structure and parse",
		Author:"Ares Lee",
		Group:"File",
		Type:"zipdatadesc",
		Name:"* ZIP Data Descriptor",
		Size:["",26], //For fixed size structure
		Parameters:{}, //Default parameters, if user has not specified, parser will use these settings
		Members:
		[
			{
				Name:"crc",
				Desc:"CRC",
				Type:["uhex","",4],
			},
			{
				Name:"compressedsize",
				Desc:"Compressed Size",
				Type:["uhex","",4],
			},
			{
				Name:"uncompressedsize",
				Desc:"Uncompressed Size",
				Type:["uhex","",4],
			},
		],
	};

    if(gStructureParser==undefined)
        setTimeout(RegisterDiskStructures,200);
    else
	{
        gStructureParser.Register(zipstructheader);
        gStructureParser.Register(zipfilerecord);
        gStructureParser.Register(zipdirentry);
        gStructureParser.Register(zipendindicator);
        gStructureParser.Register(zipdigitalsig);
        gStructureParser.Register(zipdatadesc);
	}
}
