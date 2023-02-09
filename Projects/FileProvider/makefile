PROJECT = FileProvider

all:$(PROJECT)64.so $(PROJECT)32.so

$(PROJECT)64.so:main.cpp
	g++ -o $(PROJECT)64.so -fPIC -shared -D_LINUX -D_LINUX64 -I../Providers/ Main.cpp

$(PROJECT)32.so:main.cpp
	g++ -o $(PROJECT)32.so -m32 -fPIC -shared -D_LINUX -D_LINUX32 -I../Providers/ Main.cpp
clean:
	rm $(PROJECT)64.so
	rm $(PROJECT)32.so

